import { computeGeneratedWidths, computeMaxGeneratedWidth } from '../../src/intrinsicWidth'

const LADDER = [16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840]

describe('computeMaxGeneratedWidth', () => {
  test('returns the exact ladder entry when the intrinsic matches one', () => {
    expect(computeMaxGeneratedWidth(640, LADDER)).toBe(640)
  })

  test('returns the next-larger ladder entry when the intrinsic falls between two', () => {
    expect(computeMaxGeneratedWidth(900, LADDER)).toBe(1080)
  })

  test('returns the smallest ladder entry when the intrinsic is below the whole ladder', () => {
    expect(computeMaxGeneratedWidth(8, LADDER)).toBe(16)
  })

  test('returns the largest ladder entry when the intrinsic exceeds the whole ladder', () => {
    expect(computeMaxGeneratedWidth(5000, LADDER)).toBe(3840)
  })

  test('is order-independent — sorts the ladder internally', () => {
    expect(computeMaxGeneratedWidth(900, [3840, 16, 1920, 640, 128])).toBe(1920)
  })

  test('tolerates duplicate entries in the ladder', () => {
    expect(computeMaxGeneratedWidth(640, [16, 640, 640, 1920])).toBe(640)
  })

  test('throws when the ladder is empty', () => {
    expect(() => computeMaxGeneratedWidth(640, [])).toThrow('allSizes is empty')
  })
})

describe('computeGeneratedWidths', () => {
  test('keeps every ladder entry up to and including the clamp', () => {
    expect(computeGeneratedWidths(900, LADDER)).toEqual([16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080])
  })

  test('returns only the smallest ladder entry when the intrinsic is below the whole ladder', () => {
    expect(computeGeneratedWidths(8, LADDER)).toEqual([16])
  })

  test('returns the entire ladder when the intrinsic exceeds the whole ladder', () => {
    expect(computeGeneratedWidths(5000, LADDER)).toEqual(LADDER)
  })

  test('matches an exact ladder entry inclusively (intrinsic === entry → entry is kept)', () => {
    expect(computeGeneratedWidths(640, LADDER)).toEqual([16, 32, 48, 64, 96, 128, 256, 384, 640])
  })

  test('propagates the empty-ladder error', () => {
    expect(() => computeGeneratedWidths(640, [])).toThrow('allSizes is empty')
  })
})

describe('clampWidth', () => {
  // `__NEXT_IMAGE_OPTS` is normally injected by Next's DefinePlugin as a real
  // object literal — assigning to `process.env` directly would stringify it.
  // `Object.defineProperty` bypasses the env-coercion setter so the getter
  // returns the underlying object as production code expects.
  const installImageOpts = () => {
    Object.defineProperty(process.env, '__NEXT_IMAGE_OPTS', {
      value: {
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
      },
      configurable: true,
      writable: true,
    })
  }
  const uninstallImageOpts = () => {
    // Assignment to undefined rather than `delete` (biome lint/performance/noDelete);
    // `getAllSizes` reads with `if (!opts) return undefined` so the truthiness check
    // is equivalent to the property being absent for the consumer.
    ;(process.env as Record<string, unknown>).__NEXT_IMAGE_OPTS = undefined
  }

  beforeEach(installImageOpts)
  afterEach(uninstallImageOpts)

  test('uses explicit intrinsic and ignores the prebuilt map (basePath irrelevant for the lookup)', () => {
    // No mock for the map — explicit intrinsic must short-circuit before it's consulted.
    const { clampWidth } = require('../../src/intrinsicWidth') as typeof import('../../src/intrinsicWidth')
    // intrinsic 200 → max ladder entry is 256; a request for 3840 should collapse to 256.
    expect(clampWidth('/blog/foo.png', 3840, 200, '/blog')).toBe(256)
  })

  test('strips basePath before looking up intrinsic in the prebuilt map', () => {
    jest.isolateModules(() => {
      installImageOpts()
      jest.doMock('next-export-optimize-images/intrinsic-map.json', () => ({ '/foo.png': 200 }), { virtual: true })
      const { clampWidth } = require('../../src/intrinsicWidth') as typeof import('../../src/intrinsicWidth')
      // next/image asks for `/blog/foo.png` at width 3840; the map is keyed `/foo.png`.
      // Without the basePath strip the lookup misses and we'd return 3840 unchanged.
      expect(clampWidth('/blog/foo.png', 3840, undefined, '/blog')).toBe(256)
    })
  })

  test('returns width unchanged when the basePath-stripped src is not in the map', () => {
    jest.isolateModules(() => {
      installImageOpts()
      jest.doMock('next-export-optimize-images/intrinsic-map.json', () => ({}), { virtual: true })
      const { clampWidth } = require('../../src/intrinsicWidth') as typeof import('../../src/intrinsicWidth')
      expect(clampWidth('/blog/foo.png', 3840, undefined, '/blog')).toBe(3840)
    })
  })

  test('looks up src verbatim when no basePath is given', () => {
    jest.isolateModules(() => {
      installImageOpts()
      jest.doMock('next-export-optimize-images/intrinsic-map.json', () => ({ '/foo.png': 200 }), { virtual: true })
      const { clampWidth } = require('../../src/intrinsicWidth') as typeof import('../../src/intrinsicWidth')
      expect(clampWidth('/foo.png', 3840, undefined, undefined)).toBe(256)
    })
  })

  test('does not raise a requested width that is already below the clamp', () => {
    const { clampWidth } = require('../../src/intrinsicWidth') as typeof import('../../src/intrinsicWidth')
    // intrinsic 200 → max 256, but the request is already 64; result must stay 64.
    expect(clampWidth('/blog/foo.png', 64, 200, '/blog')).toBe(64)
  })

  test('returns width unchanged when __NEXT_IMAGE_OPTS is missing', () => {
    uninstallImageOpts()
    const { clampWidth } = require('../../src/intrinsicWidth') as typeof import('../../src/intrinsicWidth')
    expect(clampWidth('/blog/foo.png', 3840, 200, '/blog')).toBe(3840)
  })
})
