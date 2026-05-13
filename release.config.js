/**
 * semantic-release config for the fork (@elliott-w/next-export-optimize-images).
 *
 * Fork-specific choices vs. upstream:
 *   - Releases from `main`, not from a dedicated `release` branch.
 *   - @semantic-release/npm runs with npmPublish: false — version bump only.
 *     scripts/publish.js handles the actual publish via the rename-and-revert
 *     dance so we ship as `@elliott-w/next-export-optimize-images` while the
 *     in-tree package.json stays unscoped (so GitHub installs still resolve).
 *   - No PR/issue comments and no released-labels — those would target
 *     dc7290's tracker, not the fork's.
 *
 * @see https://semantic-release.gitbook.io/semantic-release/
 */

const types = require('./commit-types.config')

const defaultBranch = 'main'
const changelogFile = 'CHANGELOG.md'

module.exports = {
  branches: [defaultBranch],
  tagFormat: 'v${version}',
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
        releaseRules: [
          { breaking: true, release: 'major' },
          { revert: true, release: 'patch' },
          ...types.flatMap(({ type, release }) => (release ? [{ type, release }] : [])),
        ],
      },
    ],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
        presetConfig: {
          types: types.map(({ type, section, hidden }) => ({
            type,
            section,
            hidden: hidden ?? true,
          })),
        },
      },
    ],
    [
      '@semantic-release/changelog',
      {
        changelogFile,
        changelogTitle:
          '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/) and this project adheres to [Semantic Versioning](https://semver.org/).\n\n## [Released](https://github.com/elliott-w/next-export-optimize-images/releases)',
      },
    ],
    [
      '@semantic-release/npm',
      {
        // Version-bump only. scripts/publish.js handles the actual publish
        // against the scoped name via the rename apply/revert dance.
        npmPublish: false,
      },
    ],
    [
      '@semantic-release/exec',
      {
        // Pre-flight auth check — runs in the verifyConditions phase, which
        // is BEFORE any commit/tag is created. If the token is invalid or
        // the .npmrc auth substitution is wrong (e.g. NODE_AUTH_TOKEN
        // unset), this fails fast and the whole release aborts without
        // touching origin. Without this, a publish failure leaves an orphan
        // release commit + tag on main that has to be manually cleaned up.
        verifyConditionsCmd: 'npm whoami --registry=https://registry.npmjs.org/',
        // package.json has the new version at this point. publish.js will
        // rename → npm publish (scoped) → revert. Revert restores the
        // unscoped name + bumped version so the git plugin commits the
        // correct file back to main.
        publishCmd: 'node scripts/publish.js',
      },
    ],
    [
      '@semantic-release/git',
      {
        assets: ['package.json', 'package-lock.json', changelogFile],
        // Notes intentionally omitted — they live in CHANGELOG.md + the
        // GitHub Release. Embedding them here overflows ARG_MAX on the
        // first release (no baseline tag → notes span all history).
        message: 'release: 🏹 ${nextRelease.gitTag} [skip ci]',
      },
    ],
    [
      '@semantic-release/github',
      {
        successComment: false,
        failComment: false,
        releasedLabels: false,
      },
    ],
  ],
}
