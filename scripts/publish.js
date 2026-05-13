#!/usr/bin/env node
'use strict'

// Wrapper: build → rename → publish → revert. Always reverts, even if
// publish fails — `postpublish` only runs on success, which is not enough.

const fs = require('node:fs')
const path = require('node:path')
const { execSync } = require('node:child_process')

const REPO_ROOT = path.resolve(__dirname, '..')
const RENAME_SCRIPT = path.join(__dirname, 'rename-for-publish.js')
const SNAPSHOT_PATH = path.join(REPO_ROOT, '.publish-rename-snapshot.json')

const passthroughArgs = process.argv.slice(2).join(' ')

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', cwd: REPO_ROOT })
}

run('npm run build')
run(`node "${RENAME_SCRIPT}" apply`)
try {
  // --ignore-scripts: otherwise the `prepare` lifecycle (husky + npm run
  // build) re-runs inside npm publish, regenerating dist/ AFTER the rename
  // script has patched it — the tarball would ship with unscoped paths.
  run(`npm publish --access public --ignore-scripts ${passthroughArgs}`.trim())
} finally {
  if (fs.existsSync(SNAPSHOT_PATH)) {
    run(`node "${RENAME_SCRIPT}" revert`)
  }
}
