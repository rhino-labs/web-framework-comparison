// Every framework under test. To add one: build an app under apps/ that
// renders the shared @bench/content pages, then add an entry here.

export type Target = {
  id: string
  label: string
  /** package whose installed version is shown next to the label */
  versionOf: string
  /** app directory, relative to the repo root */
  cwd: string
  /** production server command; {port} is substituted */
  start: string
  port: number
}

export const targets: Target[] = [
  {
    id: 'next',
    label: 'Next.js',
    versionOf: 'next',
    cwd: 'apps/next',
    start: 'node_modules/.bin/next start --port {port}',
    port: 4101,
  },
  {
    id: 'vinext',
    label: 'Vinext',
    versionOf: 'vinext',
    cwd: 'apps/next',
    start: 'node_modules/.bin/vinext start --port {port}',
    port: 4102,
  },
  {
    id: 'tanstack-start',
    label: 'TanStack Start',
    versionOf: '@tanstack/react-start',
    cwd: 'apps/tanstack-start',
    start: 'node_modules/.bin/vite preview --port {port} --strictPort',
    port: 4103,
  },
  {
    id: 'react-router',
    label: 'React Router',
    versionOf: 'react-router',
    cwd: 'apps/react-router',
    start: 'node_modules/.bin/react-router-serve ./build/server/index.js',
    port: 4105,
  },
  {
    id: 'foldkit',
    label: 'Foldkit',
    versionOf: 'foldkit',
    cwd: 'apps/foldkit',
    start: 'node_modules/.bin/vite preview --outDir dist/client --port {port} --strictPort',
    port: 4104,
  },
]
