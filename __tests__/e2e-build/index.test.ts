import path from 'node:path'

import fs from 'fs-extra'
import { imageConfigDefault } from 'next/dist/shared/lib/image-config'
import { computeMaxGeneratedWidth } from '../../src/intrinsicWidth'

const optimizedImagesDir = path.resolve(__dirname, '.next/static/chunks/images')
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

const HASH_SENTINEL = 'HASH'
const WIDTH_SENTINEL = 'WIDTH'
const exist = (pattern: string) => {
  const tokenized = pattern.replace(/\[hash\]/g, HASH_SENTINEL).replace(/\[width\]/g, WIDTH_SENTINEL)
  const escaped = tokenized.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  const reSrc = escaped.split(HASH_SENTINEL).join('[A-Za-z0-9_~.\\-]+').split(WIDTH_SENTINEL).join('\\d+')
  return allOptimized.some((f) => new RegExp(`^${reSrc}$`).test(f))
}

// Intrinsic pixel width per source. Drives which ladder widths are expected
// on disk under the new "skip oversized variants" behavior.
const files: { pattern: string; intrinsic: number }[] = [
  // webp — static import (img.png is 1920×1281)
  { pattern: '_next/static/media/img.[hash]_[width].webp', intrinsic: 1920 },
  // webp — remote (picsum 200×300 → intrinsic 200)
  { pattern: 'id/237/200/300_[width].webp', intrinsic: 200 },
  { pattern: 'id/238/200/300_[width].webp', intrinsic: 200 },

  // png or jpg
  { pattern: '_next/static/media/img.[hash]_[width].png', intrinsic: 1920 },
  { pattern: 'id/237/200/300_[width].jpg', intrinsic: 200 },
  { pattern: 'id/238/200/300_[width].jpg', intrinsic: 200 },
]

describe('`next build && next export && next-export-optimize-images` is executed correctly', () => {
  test('Images are being generated.', async () => {
    const customConfig = require('./next.config.js')
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
})
