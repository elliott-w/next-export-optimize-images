import type { ImageConfigComplete } from 'next/dist/shared/lib/image-config'
import type { ImageProps, StaticImageData } from 'next/dist/shared/lib/image-external'

export type IntrinsicMap = Record<string, number>

type StaticRequire = { default: StaticImageData }

/**
 * Largest ladder width to generate for an intrinsic — smallest entry ≥ intrinsic,
 * or the largest entry if no entry meets it. The runtime loader collapses larger
 * requested widths down to this URL.
 */
export const computeMaxGeneratedWidth = (intrinsic: number, allSizes: number[]): number => {
  const sorted = [...allSizes].sort((a, b) => a - b)
  const above = sorted.find((size) => size >= intrinsic)
  if (above !== undefined) return above
  const last = sorted[sorted.length - 1]
  if (last === undefined) throw new Error('computeMaxGeneratedWidth: allSizes is empty')
  return last
}

/** Ladder widths to actually write files for, given the source's intrinsic width. */
export const computeGeneratedWidths = (intrinsic: number, allSizes: number[]): number[] => {
  const max = computeMaxGeneratedWidth(intrinsic, allSizes)
  return allSizes.filter((size) => size <= max)
}

let cached: IntrinsicMap | undefined

const loadIntrinsicMap = (): IntrinsicMap => {
  if (cached) return cached
  if (typeof window !== 'undefined') {
    cached = {}
    return cached
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cached = require('next-export-optimize-images/intrinsic-map.json') as IntrinsicMap
  } catch {
    cached = {}
  }
  return cached
}

/** Look up a previously-probed intrinsic for a string src (e.g. /public path, remote URL). */
export const getIntrinsicForSrc = (src: string): number | undefined => loadIntrinsicMap()[src]

/** Pull intrinsic off a static import. Returns undefined for plain string srcs. */
export const getIntrinsicFromImageSrc = (imgSrc: ImageProps['src']): number | undefined => {
  if (typeof imgSrc === 'string') return undefined
  if ((imgSrc as StaticRequire).default !== undefined) return (imgSrc as StaticRequire).default.width
  return (imgSrc as StaticImageData).width
}

const getAllSizes = (): number[] | undefined => {
  const opts = process.env.__NEXT_IMAGE_OPTS as unknown as ImageConfigComplete | undefined
  if (!opts) return undefined
  return [...(opts.imageSizes ?? []), ...(opts.deviceSizes ?? [])]
}

/**
 * Clamp the next/image-requested `width` down to `computeMaxGeneratedWidth(intrinsic, ladder)`
 * when an intrinsic is known. Resolves intrinsic from (in priority order):
 * caller-supplied `explicitIntrinsic` → side-channel map keyed by src.
 */
export const clampWidth = (
  src: string,
  width: number,
  explicitIntrinsic: number | undefined,
  basePath: string | undefined
): number => {
  const lookupSrc = basePath !== undefined ? src.replace(basePath, '') : src
  const intrinsic = explicitIntrinsic ?? getIntrinsicForSrc(lookupSrc)
  if (intrinsic === undefined) return width
  const allSizes = getAllSizes()
  if (!allSizes || allSizes.length === 0) return width
  return Math.min(width, computeMaxGeneratedWidth(intrinsic, allSizes))
}
