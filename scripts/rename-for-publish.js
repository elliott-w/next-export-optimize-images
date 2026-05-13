#!/usr/bin/env node
'use strict'

const fs = require('node:fs')
const path = require('node:path')

const REPO_ROOT = path.resolve(__dirname, '..')
const PKG_PATH = path.join(REPO_ROOT, 'package.json')
const DIST_DIR = path.join(REPO_ROOT, 'dist')
const SNAPSHOT_PATH = path.join(REPO_ROOT, '.publish-rename-snapshot.json')

const OLD = 'next-export-optimize-images'
const NEW = process.env.PUBLISH_NAME || '@elliott-w/next-export-optimize-images'

const mode = process.argv[2]
if (mode === 'apply') apply()
else if (mode === 'revert') revert()
else {
  console.error(`usage: ${path.basename(__filename)} <apply|revert>`)
  console.error(`  PUBLISH_NAME env var overrides the target name (default: ${NEW})`)
  process.exit(2)
}

function apply() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error(`error: ${path.relative(REPO_ROOT, DIST_DIR)} not found — run \`npm run build\` first`)
    process.exit(1)
  }
  if (fs.existsSync(SNAPSHOT_PATH)) {
    console.error(
      `error: snapshot already exists at ${path.relative(REPO_ROOT, SNAPSHOT_PATH)} — run \`revert\` or delete it`
    )
    process.exit(1)
  }

  // Snapshot package.json — the only tracked file we mutate. dist/ is
  // gitignored and rebuilt each publish, so no need to revert it.
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify({ packageJson: fs.readFileSync(PKG_PATH, 'utf8') }))

  rewritePackageJson()
  let patched = 0
  walkDist((file) => {
    if (rewriteJsLike(file)) patched++
  })
  console.log(`renamed: ${OLD} → ${NEW} (package.json + ${patched} dist file${patched === 1 ? '' : 's'})`)
}

function revert() {
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    console.error(`error: no snapshot at ${path.relative(REPO_ROOT, SNAPSHOT_PATH)} — nothing to revert`)
    process.exit(1)
  }
  const snap = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'))
  fs.writeFileSync(PKG_PATH, snap.packageJson)
  fs.rmSync(SNAPSHOT_PATH)
  console.log('reverted package.json (dist/ is rebuilt on next publish; not reverted)')
}

function rewritePackageJson() {
  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'))
  pkg.name = NEW
  fs.writeFileSync(PKG_PATH, `${JSON.stringify(pkg, null, 2)}\n`)
}

function walkDist(cb) {
  const stack = [DIST_DIR]
  while (stack.length) {
    const dir = stack.pop()
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name)
      if (entry.isDirectory()) stack.push(p)
      else if (/\.(js|cjs|mjs|d\.ts|d\.cts|d\.mts)$/.test(entry.name)) cb(p)
    }
  }
}

function rewriteJsLike(filePath) {
  const original = fs.readFileSync(filePath, 'utf8')
  let src = original

  // 1) SKIP_ISSUER_REGEX literal in unstableNextImageAlias. A scoped name's
  //    "/" would terminate the regex literal, so each segment of the new
  //    name becomes its own [\\/]-separated chunk inside the character
  //    class. Must run before rule 3 — otherwise the inserted "/" breaks
  //    regex syntax.
  const oldRegexFrag = '[\\\\/]node_modules[\\\\/]next-export-optimize-images[\\\\/]'
  const newRegexInner = NEW.split('/').join('[\\\\/]')
  const newRegexFrag = `[\\\\/]node_modules[\\\\/]${newRegexInner}[\\\\/]`
  src = src.split(oldRegexFrag).join(newRegexFrag)

  // 2) appRootPath.resolve target — the literal 'node_modules/<name>/' path.
  src = src.split(`node_modules/${OLD}/`).join(`node_modules/${NEW}/`)

  // 3) Quoted module specifiers — anchored at the opening quote so that
  //    internal coordination strings keep working:
  //      - manifest filename ".next/next-export-optimize-images-list.nd.json"
  //      - webpack loader name "next-export-optimize-images-loader"
  //      - default cache dir "node_modules/.cache/next-export-optimize-images"
  //    None of those are followed by "/" + path segments inside the same
  //    quoted string, so they don't match this pattern.
  src = src.replace(
    /(['"])next-export-optimize-images(\/[^'"]*)?\1/g,
    (_m, q, rest = '') => `${q}${NEW}${rest}${q}`
  )

  if (src === original) return false
  fs.writeFileSync(filePath, src)
  console.log(`  patched ${path.relative(REPO_ROOT, filePath)}`)
  return true
}
