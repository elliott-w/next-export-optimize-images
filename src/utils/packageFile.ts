import path from 'node:path'
import appRootPath from 'app-root-path'

const PACKAGE_NAME = 'next-export-optimize-images'

const resolvePackageRoot = (): string => {
  try {
    // Production path: Node's resolver finds the installed package, surviving
    // pnpm symlinks and monorepo hoisting that `node_modules/<pkg>` heuristics
    // miss.
    return path.dirname(require.resolve(`${PACKAGE_NAME}/package.json`))
  } catch {
    // Self-testing fallback: when this repo runs its own e2e tests, there's no
    // `node_modules/<PACKAGE_NAME>/package.json` to resolve — the package IS the
    // app root. Match the legacy `appRootPath` behaviour so the test fixtures
    // keep working.
    return appRootPath.resolve(`node_modules/${PACKAGE_NAME}`)
  }
}

const packageRoot = resolvePackageRoot()

/** Resolve a file path inside the installed `next-export-optimize-images` package directory. */
export const packageFile = (relPath: string): string => path.join(packageRoot, relPath)
