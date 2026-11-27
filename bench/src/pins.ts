// Which dependencies `pnpm monthly` moves to the latest release, and how a
// failed build rolls back to the specs already in the repo.

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export type Section = 'dependencies' | 'devDependencies'

export type Pin = {
  /** Framework this pin belongs to. `shared` is tooling used to build it. */
  group: string
  file: string
  section: Section
  name: string
  /** npm package whose latest version this pin follows. Defaults to `name`. */
  versionOf?: string
  kind?: 'npm' | 'effect-snapshot'
}

export type PackageJson = {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  [key: string]: unknown
}

const shared = (file: string, section: Section, name: string, versionOf?: string): Pin => ({
  group: 'shared',
  file,
  section,
  name,
  versionOf,
})

export const pins: Pin[] = [
  { group: 'next', file: 'apps/next/package.json', section: 'dependencies', name: 'next' },
  { group: 'vinext', file: 'apps/next/package.json', section: 'dependencies', name: 'vinext' },
  { group: 'vinext', file: 'apps/next/package.json', section: 'devDependencies', name: '@vitejs/plugin-rsc' },
  shared('apps/next/package.json', 'dependencies', 'react', 'react'),
  shared('apps/next/package.json', 'dependencies', 'react-dom', 'react'),
  shared('apps/next/package.json', 'dependencies', 'react-server-dom-webpack', 'react'),
  shared('apps/next/package.json', 'devDependencies', '@types/node'),
  shared('apps/next/package.json', 'devDependencies', '@types/react'),
  shared('apps/next/package.json', 'devDependencies', '@types/react-dom'),
  shared('apps/next/package.json', 'devDependencies', '@vitejs/plugin-react'),
  shared('apps/next/package.json', 'devDependencies', 'typescript'),
  shared('apps/next/package.json', 'devDependencies', 'vite'),

  { group: 'astro', file: 'apps/astro/package.json', section: 'dependencies', name: 'astro' },
  { group: 'astro', file: 'apps/astro/package.json', section: 'dependencies', name: '@astrojs/react' },
  shared('apps/astro/package.json', 'dependencies', 'react', 'react'),
  shared('apps/astro/package.json', 'dependencies', 'react-dom', 'react'),
  shared('apps/astro/package.json', 'devDependencies', '@types/react'),
  shared('apps/astro/package.json', 'devDependencies', '@types/react-dom'),
  shared('apps/astro/package.json', 'devDependencies', 'typescript'),

  {
    group: 'effect-ui',
    file: 'apps/effect-ui/package.json',
    section: 'dependencies',
    name: '@effect/ui',
    kind: 'effect-snapshot',
  },
  { group: 'effect-ui', file: 'apps/effect-ui/package.json', section: 'dependencies', name: 'effect' },
  shared('apps/effect-ui/package.json', 'devDependencies', '@types/node'),
  shared('apps/effect-ui/package.json', 'devDependencies', 'typescript'),
  shared('apps/effect-ui/package.json', 'devDependencies', 'vite'),

  { group: 'react-router', file: 'apps/react-router/package.json', section: 'dependencies', name: 'react-router' },
  {
    group: 'react-router',
    file: 'apps/react-router/package.json',
    section: 'dependencies',
    name: '@react-router/node',
    versionOf: 'react-router',
  },
  {
    group: 'react-router',
    file: 'apps/react-router/package.json',
    section: 'dependencies',
    name: '@react-router/serve',
    versionOf: 'react-router',
  },
  {
    group: 'react-router',
    file: 'apps/react-router/package.json',
    section: 'devDependencies',
    name: '@react-router/dev',
    versionOf: 'react-router',
  },
  shared('apps/react-router/package.json', 'dependencies', 'react', 'react'),
  shared('apps/react-router/package.json', 'dependencies', 'react-dom', 'react'),
  shared('apps/react-router/package.json', 'devDependencies', '@types/node'),
  shared('apps/react-router/package.json', 'devDependencies', '@types/react'),
  shared('apps/react-router/package.json', 'devDependencies', '@types/react-dom'),
  shared('apps/react-router/package.json', 'devDependencies', 'typescript'),
  shared('apps/react-router/package.json', 'devDependencies', 'vite'),

  { group: 'tanstack-start', file: 'apps/tanstack-start/package.json', section: 'dependencies', name: '@tanstack/react-start' },
  { group: 'tanstack-start', file: 'apps/tanstack-start/package.json', section: 'dependencies', name: '@tanstack/react-router' },
  shared('apps/tanstack-start/package.json', 'dependencies', 'react', 'react'),
  shared('apps/tanstack-start/package.json', 'dependencies', 'react-dom', 'react'),
  shared('apps/tanstack-start/package.json', 'devDependencies', '@types/node'),
  shared('apps/tanstack-start/package.json', 'devDependencies', '@types/react'),
  shared('apps/tanstack-start/package.json', 'devDependencies', '@types/react-dom'),
  shared('apps/tanstack-start/package.json', 'devDependencies', '@vitejs/plugin-react'),
  shared('apps/tanstack-start/package.json', 'devDependencies', 'typescript'),
  shared('apps/tanstack-start/package.json', 'devDependencies', 'vite'),

  { group: 'xote', file: 'apps/xote/package.json', section: 'dependencies', name: 'xote' },
  { group: 'xote', file: 'apps/xote/package.json', section: 'dependencies', name: 'rescript-signals' },
  { group: 'xote', file: 'apps/xote/package.json', section: 'dependencies', name: '@rescript/runtime', versionOf: 'rescript' },
  { group: 'xote', file: 'apps/xote/package.json', section: 'devDependencies', name: 'rescript' },
  shared('apps/xote/package.json', 'devDependencies', 'vite'),

  shared('packages/react-ui/package.json', 'devDependencies', 'react', 'react'),
  shared('packages/react-ui/package.json', 'devDependencies', '@types/react'),
  shared('packages/react-ui/package.json', 'devDependencies', 'typescript'),

  { group: 'bench', file: 'bench/package.json', section: 'dependencies', name: 'playwright' },
]

/** The package whose version is shown next to the framework name. */
export const primaryPackage: Record<string, string> = {
  next: 'next',
  vinext: 'vinext',
  'tanstack-start': '@tanstack/react-start',
  'react-router': 'react-router',
  astro: 'astro',
  'effect-ui': '@effect/ui',
  xote: 'xote',
}

export const frameworkLabel: Record<string, string> = {
  next: 'Next.js',
  vinext: 'Vinext',
  'tanstack-start': 'TanStack Start',
  'react-router': 'React Router',
  astro: 'Astro',
  'effect-ui': 'Effect UI',
  xote: 'Xote',
}

/**
 * Package.json files restored when a framework's own packages were not the
 * whole problem. Next.js and vinext share `apps/next`.
 */
export const frameworkFiles: Record<string, string[]> = {
  next: ['apps/next/package.json', 'packages/react-ui/package.json'],
  vinext: ['apps/next/package.json'],
  'tanstack-start': ['apps/tanstack-start/package.json', 'packages/react-ui/package.json'],
  'react-router': ['apps/react-router/package.json', 'packages/react-ui/package.json'],
  astro: ['apps/astro/package.json', 'packages/react-ui/package.json'],
  'effect-ui': ['apps/effect-ui/package.json'],
  xote: ['apps/xote/package.json'],
}

export const builds: { id: string; command: string[] }[] = [
  { id: 'next', command: ['pnpm', '--filter', '@bench/next', 'run', 'build:next'] },
  { id: 'vinext', command: ['pnpm', '--filter', '@bench/next', 'run', 'build:vinext'] },
  { id: 'tanstack-start', command: ['pnpm', '--filter', '@bench/tanstack-start', 'run', 'build:all'] },
  { id: 'react-router', command: ['pnpm', '--filter', '@bench/react-router', 'run', 'build:all'] },
  { id: 'astro', command: ['pnpm', '--filter', '@bench/astro', 'run', 'build:all'] },
  { id: 'effect-ui', command: ['pnpm', '--filter', '@bench/effect-ui', 'run', 'build:all'] },
  { id: 'xote', command: ['pnpm', '--filter', '@bench/xote', 'run', 'build:all'] },
]

/** Highest stable x.y.z in `npm view` output. A major range prints every release, not the newest. */
export function maxStableVersion(stdout: string): string {
  const quoted = [...stdout.matchAll(/'([^']+)'/g)].map(match => match[1]!)
  const lines = quoted.length ? quoted : stdout.trim().split('\n').map(line => line.trim())
  const stable = lines.filter(version => /^\d+\.\d+\.\d+$/.test(version))
  if (!stable.length) throw new Error(`no stable version in npm output:\n${stdout}`)
  const cmp = (a: string, b: string) => {
    const pa = a.split('.').map(Number)
    const pb = b.split('.').map(Number)
    for (let i = 0; i < 3; i++) {
      const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
      if (diff) return diff
    }
    return 0
  }
  return stable.sort(cmp).at(-1)!
}

export function withPrefix(spec: string, version: string): string {
  const prefix = spec.startsWith('^') ? '^' : spec.startsWith('~') ? '~' : ''
  return prefix + version
}

/** Latest version, written the way the current spec is written (exact, ^, or ~). */
export function specFor(current: string, version: string, kind?: Pin['kind']): string {
  if (kind === 'effect-snapshot') {
    const next = current.replace(/@[0-9a-f]{7,40}$/, `@${version}`)
    if (next === current) throw new Error(`could not find a commit sha in ${current}`)
    return next
  }
  return withPrefix(current, version)
}

export function readPkg(root: string, file: string): PackageJson {
  return JSON.parse(readFileSync(join(root, file), 'utf8')) as PackageJson
}

export function writePkg(root: string, file: string, pkg: PackageJson) {
  writeFileSync(join(root, file), JSON.stringify(pkg, null, 2) + '\n')
}

export function getSpec(pkg: PackageJson, pin: Pin): string {
  const spec = pkg[pin.section]?.[pin.name]
  if (spec === undefined) throw new Error(`${pin.file} has no ${pin.section}.${pin.name}`)
  return spec
}

export function setSpec(pkg: PackageJson, pin: Pin, spec: string) {
  const section = (pkg[pin.section] ??= {})
  section[pin.name] = spec
}

export function effectVersionIn(source: string): string {
  const match = source.match(/id:\s*'effect-ui'[\s\S]*?version:\s*'([0-9a-f]+)'/)
  if (!match) throw new Error('could not find the Effect UI version pin in bench/src/targets.ts')
  return match[1]!
}

export function replaceEffectVersion(source: string, sha: string): string {
  const next = source.replace(/(id:\s*'effect-ui'[\s\S]*?version:\s*')([0-9a-f]+)(')/, `$1${sha}$3`)
  if (next === source) throw new Error('could not find the Effect UI version pin in bench/src/targets.ts')
  return next
}

/** The fairness note in the README names the snapshot commit and the day it was pinned. */
export function replaceEffectReadme(readme: string, sha: string, date: string): string {
  const pattern = /snapshot of commit `([0-9a-f]+)` \(\d{4}-\d{2}-\d{2}\)/
  if (!pattern.test(readme)) return readme
  return readme.replace(pattern, `snapshot of commit \`${sha}\` (${date})`)
}
