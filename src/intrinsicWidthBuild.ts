import path from 'node:path'
import fs from 'fs-extra'
import recursiveReadDir from 'recursive-readdir'
import sharp from 'sharp'
import type { Manifest } from './cli'
import { type IntrinsicMap, computeMaxGeneratedWidth } from './intrinsicWidth'
import type { Config } from './utils/getConfig'
import { packageFile } from './utils/packageFile'

const IMAGE_EXTENSIONS: ReadonlySet<string> = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif'])
const isImageFile = (file: string): boolean => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase())

const intrinsicMapPath = packageFile('intrinsic-map.json')

/**
 * Pre-pass invoked from `withExportImages`: walk `/public`, fetch declared
 * remoteImages, write a JSON map of src → intrinsic pixel width. The runtime
 * loader and the CLI both read that file to clamp/skip oversized widths.
 *
 * Static imports route intrinsic via the component-level curry, so /public +
 * config.remoteImages are the cases that need this side-channel. Anything
 * missing from the map gets a sharp fallback inside `filterOversizedManifest`.
 */
export const buildIntrinsicMap = async ({
  publicDir,
  ignorePaths,
  remoteImages,
}: {
  publicDir: string
  ignorePaths: string[]
  remoteImages: string[] | undefined
}): Promise<void> => {
  const map: IntrinsicMap = {}

  if (fs.existsSync(publicDir)) {
    const files = await recursiveReadDir(publicDir, [(file) => ignorePaths.includes(file)])
    await Promise.all(
      files.map(async (file) => {
        if (!isImageFile(file)) return
        try {
          const metadata = await sharp(file).metadata()
          if (metadata.width !== undefined) {
            const src = `/${path.relative(publicDir, file).split(path.sep).join('/')}`
            map[src] = metadata.width
          }
        } catch {
          // sharp couldn't read — leave src out of the map.
        }
      })
    )
  }

  if (Array.isArray(remoteImages) && remoteImages.length > 0) {
    // Fetch the first 64KB via HTTPS Range, hand to sharp for metadata. The
    // runtime loader can't do sync HTTPS so undeclared URLs without a `width`
    // prop fall back to enrolling the full ladder (CLI filter then prunes).
    await Promise.all(
      remoteImages.map(async (url) => {
        try {
          const response = await fetch(url, { headers: { Range: 'bytes=0-65535' } })
          if (!response.ok && response.status !== 206) {
            console.warn(
              `[next-export-optimize-images] Failed to probe intrinsic width for ${url}: HTTP ${response.status}. Full srcSet ladder will be enrolled.`
            )
            return
          }
          const arrayBuffer = await response.arrayBuffer()
          const metadata = await sharp(Buffer.from(arrayBuffer)).metadata()
          if (metadata.width === undefined) {
            console.warn(
              `[next-export-optimize-images] Could not read intrinsic width for ${url} (sharp returned no width). Full srcSet ladder will be enrolled.`
            )
            return
          }
          map[url] = metadata.width
        } catch (error) {
          // Leave URL out of the map; the runtime enrolls the full ladder.
          console.warn(
            `[next-export-optimize-images] Failed to probe intrinsic width for ${url}: ${
              error instanceof Error ? error.message : String(error)
            }. Full srcSet ladder will be enrolled.`
          )
        }
      })
    )
  }

  fs.ensureFileSync(intrinsicMapPath)
  fs.writeFileSync(intrinsicMapPath, JSON.stringify(map))
}

const loadPrebuiltIntrinsicMap = (): IntrinsicMap => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('next-export-optimize-images/intrinsic-map.json') as IntrinsicMap
  } catch {
    return {}
  }
}

/**
 * Drop manifest entries that would exceed `computeMaxGeneratedWidth`. Runtime
 * loader applies the same clamp, so the set of files we write matches the set
 * the markup will ever request. Prefer the prebuilt map; fall back to sharp
 * for srcs missing from it (Turbopack-discovered static imports, etc.).
 */
export const filterOversizedManifest = async ({
  manifest,
  allSizes,
  srcDir,
  config,
}: {
  manifest: Manifest
  allSizes: number[]
  srcDir: string
  config: Config
}): Promise<Manifest> => {
  const prebuiltMap = loadPrebuiltIntrinsicMap()
  const intrinsicBySrc = new Map<string, number>()
  const needsProbe: { src: string; filePath: string }[] = []
  const externalUrlBySrc = new Map<string, string | undefined>()
  for (const item of manifest) {
    if (!externalUrlBySrc.has(item.src)) externalUrlBySrc.set(item.src, item.externalUrl)
  }
  for (const [src, externalUrl] of externalUrlBySrc) {
    const fromMap = prebuiltMap[externalUrl ?? src]
    if (fromMap !== undefined) {
      intrinsicBySrc.set(src, fromMap)
    } else {
      needsProbe.push({
        src,
        filePath: path.join(srcDir, config.mode === 'build' ? src.replace(/^\/_next/, '/.next') : src),
      })
    }
  }
  await Promise.all(
    needsProbe.map(async ({ src, filePath }) => {
      try {
        const metadata = await sharp(filePath).metadata()
        if (metadata.width !== undefined) intrinsicBySrc.set(src, metadata.width)
      } catch {
        // Non-image or sharp can't read — leave unfiltered.
      }
    })
  )
  return manifest.filter((item) => {
    const intrinsic = intrinsicBySrc.get(item.src)
    if (intrinsic === undefined) return true
    return item.width <= computeMaxGeneratedWidth(intrinsic, allSizes)
  })
}
