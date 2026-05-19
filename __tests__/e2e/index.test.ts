import path from 'node:path'

import fs from 'fs-extra'
import { imageConfigDefault } from 'next/dist/shared/lib/image-config'
import { computeMaxGeneratedWidth } from '../../src/intrinsicWidth'

// Recursively walk the optimized-images output dir once and cache the results
// so the per-pattern match below stays cheap.
const optimizedImagesDir = path.resolve(__dirname, 'out/_next/static/chunks/images')
const listAll = (root: string): string[] => {
  if (!fs.existsSync(root)) return []
  const out: string[] = []
  const stack: string[] = [root]
  while (stack.length > 0) {
    const cur = stack.pop()
    if (cur === undefined) break
    for (const entry of fs.readdirSync(cur, { withFileTypes: true })) {
      const full = path.join(cur, entry.name)
      if (entry.isDirectory()) stack.push(full)
      else out.push(path.relative(root, full).split(path.sep).join('/'))
    }
  }
  return out
}
const allOptimized = listAll(optimizedImagesDir)

// Patterns may contain `[hash]` (matches any contiguous hash segment Turbopack
// or webpack emits — base36 chars plus `_~.-`) and `[width]` (replaced with the
// specific width being checked).
const HASH_SENTINEL = 'HASH'
const WIDTH_SENTINEL = 'WIDTH'
const exist = (pattern: string) => {
  const tokenized = pattern.replace(/\[hash\]/g, HASH_SENTINEL).replace(/\[width\]/g, WIDTH_SENTINEL)
  const escaped = tokenized.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  const reSrc = escaped.split(HASH_SENTINEL).join('[A-Za-z0-9_~.\\-]+').split(WIDTH_SENTINEL).join('\\d+')
  return allOptimized.some((f) => new RegExp(`^${reSrc}$`).test(f))
}

// Intrinsic widths per source — used to compute which ladder widths should
// land on disk after the "skip larger than source" filter the loader and CLI
// share. Bare-1920 imports/public fixtures are img/legacy-img/picture/etc.;
// `get-props-mobile.png` is 903 wide; picsum URLs `/{id}/{W}/{H}` carry intrinsic
// equal to W (200 across the test set); the animated webp is 400 wide.
const STATIC_1920 = 1920
const STATIC_MOBILE = 903
const REMOTE_PICSUM = 200
const ANIMATED = 400

const files: { pattern: string; intrinsic: number }[] = [
  // avif
  { pattern: '_next/static/media/img.[hash]_[width].avif', intrinsic: STATIC_1920 },
  { pattern: '_next/static/media/get-props.[hash]_[width].avif', intrinsic: STATIC_1920 },
  { pattern: '_next/static/media/get-props-mobile.[hash]_[width].avif', intrinsic: STATIC_MOBILE },
  { pattern: 'images/img_[width].avif', intrinsic: STATIC_1920 },
  { pattern: 'id/237/200/300_[width].avif', intrinsic: REMOTE_PICSUM },
  { pattern: 'id/238/200/300_[width].avif', intrinsic: REMOTE_PICSUM },
  { pattern: 'id/500/200/400_[width].avif', intrinsic: REMOTE_PICSUM },
  { pattern: 'images/animated_[width].avif', intrinsic: ANIMATED },
  { pattern: '_next/static/media/client-only.[hash]_[width].avif', intrinsic: STATIC_1920 },
  { pattern: '_next/static/media/legacy-img.[hash]_[width].avif', intrinsic: STATIC_1920 },
  { pattern: 'images/legacy-img_[width].avif', intrinsic: STATIC_1920 },
  { pattern: '_next/static/media/picture.[hash]_[width].avif', intrinsic: STATIC_1920 },
  { pattern: 'images/picture_[width].avif', intrinsic: STATIC_1920 },

  // webp
  { pattern: '_next/static/media/img.[hash]_[width].webp', intrinsic: STATIC_1920 },
  { pattern: '_next/static/media/get-props.[hash]_[width].webp', intrinsic: STATIC_1920 },
  { pattern: '_next/static/media/get-props-mobile.[hash]_[width].webp', intrinsic: STATIC_MOBILE },
  { pattern: 'images/img_[width].webp', intrinsic: STATIC_1920 },
  { pattern: 'id/237/200/300_[width].webp', intrinsic: REMOTE_PICSUM },
  { pattern: 'id/238/200/300_[width].webp', intrinsic: REMOTE_PICSUM },
  { pattern: 'id/500/200/400_[width].webp', intrinsic: REMOTE_PICSUM },
  { pattern: 'images/animated_[width].webp', intrinsic: ANIMATED },
  { pattern: '_next/static/media/client-only.[hash]_[width].webp', intrinsic: STATIC_1920 },
  { pattern: '_next/static/media/legacy-img.[hash]_[width].webp', intrinsic: STATIC_1920 },
  { pattern: 'images/legacy-img_[width].webp', intrinsic: STATIC_1920 },
  { pattern: '_next/static/media/picture.[hash]_[width].webp', intrinsic: STATIC_1920 },
  { pattern: 'images/picture_[width].webp', intrinsic: STATIC_1920 },

  // png or jpg
  { pattern: '_next/static/media/img.[hash]_[width].png', intrinsic: STATIC_1920 },
  { pattern: '_next/static/media/get-props.[hash]_[width].png', intrinsic: STATIC_1920 },
  { pattern: '_next/static/media/get-props-mobile.[hash]_[width].png', intrinsic: STATIC_MOBILE },
  { pattern: 'images/img_[width].png', intrinsic: STATIC_1920 },
  { pattern: 'id/237/200/300_[width].jpg', intrinsic: REMOTE_PICSUM },
  { pattern: 'id/238/200/300_[width].jpg', intrinsic: REMOTE_PICSUM },
  { pattern: 'id/300/200/400_[width].jpg', intrinsic: REMOTE_PICSUM },
  { pattern: 'id/400/200/400_[width].jpg', intrinsic: REMOTE_PICSUM },
  { pattern: 'id/500/200/400_[width].jpg', intrinsic: REMOTE_PICSUM },
  { pattern: '_next/static/media/client-only.[hash]_[width].png', intrinsic: STATIC_1920 },
  { pattern: '_next/static/media/legacy-img.[hash]_[width].png', intrinsic: STATIC_1920 },
  { pattern: 'images/legacy-img_[width].png', intrinsic: STATIC_1920 },
  { pattern: '_next/static/media/picture.[hash]_[width].png', intrinsic: STATIC_1920 },
  { pattern: 'images/picture_[width].png', intrinsic: STATIC_1920 },
]

describe('`next build && next export && next-export-optimize-images` is executed correctly', () => {
  test('Images are being generated.', async () => {
    const customConfig = await require('./next.config.js')
    const configImages = { ...imageConfigDefault, ...customConfig.images }
    const allSizes = [...configImages.imageSizes, ...configImages.deviceSizes]
    for (const { pattern: file, intrinsic } of files) {
      const max = computeMaxGeneratedWidth(intrinsic, allSizes)
      for (const size of allSizes) {
        const pattern = file.replace('[width]', size.toString())
        const shouldExist = size <= max
        const isExist = exist(pattern)
        if (isExist !== shouldExist) {
          console.log('expected', shouldExist, 'got', isExist, '→', pattern)
        }
        expect(isExist).toBe(shouldExist)
      }
    }
  })

  test('ignorePaths is working.', async () => {
    const isExist = exist('images/ignore-img.png')
    expect(isExist).toBeFalsy()
  })
})
