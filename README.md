<a href="https://next-export-optimize-images.vercel.app" target="_blank"><img src="https://next-export-optimize-images.vercel.app/og.png" /></a>

<div>
<a href="https://www.npmjs.com/package/next-export-optimize-images" target="_blank"><img alt="npm" src="https://img.shields.io/npm/v/next-export-optimize-images"></a>
<a href="https://npmcharts.com/compare/next-export-optimize-images?minimal=true" target="_blank"><img alt="downloads" src="https://img.shields.io/npm/dt/next-export-optimize-images"></a>
<a href="https://www.npmjs.com/package/next-export-optimize-images" target="__blank"><img alt="License" src="https://img.shields.io/npm/l/next-export-optimize-images?label=License"></a>
<a href="https://github.com/dc7290/next-export-optimize-images/actions/workflows/node.js.yml" target="_blank"><img alt="Node.js CI" src="https://github.com/dc7290/next-export-optimize-images/actions/workflows/node.js.yml/badge.svg"></a>
<a href="https://github.com/dc7290/next-export-optimize-images/stargazers" target="_blank"><img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/dc7290/next-export-optimize-images?style=social"></a>
</div>

# Next Export Optimize Images

Using this repository, you can get the full benefits of `next/image` even when using `next export` by doing image optimization at build time.

This makes it possible to build a high performance website with this solution, whether you want to build a simple website or a completely static output.

## Feature

- Optimize images at build time.
- All options for `next/image` available
- Convert formats (png → webp, etc.)
- Download external images locally.
- Using `sharp`, so it's fast.
- Cache prevents repeating the same optimization
- Support TypeScript
- Support AppRouter

## Installation

This fork ships through two channels. Pick whichever fits your workflow — they're functionally identical, the only difference is the import specifier.

### Option 1: npm (scoped package)

Published to npm as `@elliott-w/next-export-optimize-images`:

```bash
npm install @elliott-w/next-export-optimize-images
```

Imports use the scoped name:

```ts
import withExportImages from '@elliott-w/next-export-optimize-images'
import Image from '@elliott-w/next-export-optimize-images/image'
import RemoteImage from '@elliott-w/next-export-optimize-images/remote-image'
```

### Option 2: Direct from GitHub

Useful for pinning to a specific commit, or running off `main` without waiting for a release:

```bash
# latest main
npm install github:elliott-w/next-export-optimize-images

# pinned to a specific commit (recommended)
npm install github:elliott-w/next-export-optimize-images#<commit-sha>
```

With this method the dependency name stays as the unscoped `next-export-optimize-images`, so imports use the unscoped name:

```ts
import withExportImages from 'next-export-optimize-images'
import Image from 'next-export-optimize-images/image'
import RemoteImage from 'next-export-optimize-images/remote-image'
```

The `prepare` script builds `dist/` on install, so no extra setup is needed in the consuming app.

## Document Site

https://next-export-optimize-images.vercel.app

### DeepWiki

https://deepwiki.com/dc7290/next-export-optimize-images

## License

Next Export Optimize Images is available under the MIT License.
