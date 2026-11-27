// One command for the monthly update:
//
//   pnpm monthly
//
// Bumps every framework to its latest release, and build tooling to the latest
// release of the major already in the repo. Installs and builds. A framework
// that fails to build is put back on the version already in the repo. Then the
// benchmark runs with the usual defaults, the run is appended to
// bench/results/history.json, and both charts and the generated README
// sections are redrawn.
//
//   pnpm monthly -- --dry-run    # print the versions and stop

import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { appendLatest, loadHistory, root } from '../bench/src/history.ts'
import {
  builds,
  effectVersionIn,
  frameworkFiles,
  frameworkLabel,
  getSpec,
  maxStableVersion,
  pins,
  primaryPackage,
  readPkg,
  replaceEffectReadme,
  replaceEffectVersion,
  setSpec,
  specFor,
  writePkg,
  type PackageJson,
  type Pin,
} from '../bench/src/pins.ts'
import { updateReadme, type LatestResults } from '../bench/src/readme.ts'

type Plan = { pin: Pin; from: string; to: string; spec: string }

const targetsPath = 'bench/src/targets.ts'
const lockPath = 'pnpm-lock.yaml'
const readmePath = 'README.md'

function run(command: string[]): boolean {
  console.log(`\n> ${command.join(' ')}`)
  const result = spawnSync(command[0]!, command.slice(1), {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
  })
  return result.status === 0
}

const versionCache = new Map<string, string>()

/** Latest release. `major` limits the lookup to that major (tooling keeps the major the repo already uses). */
function latestNpm(name: string, major?: string): string {
  const key = major ? `${name}@${major}` : name
  const cached = versionCache.get(key)
  if (cached) return cached
  const result = spawnSync('npm', ['view', key, 'version'], { cwd: root, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`npm view ${key} failed\n${result.stderr}`)
  const version = maxStableVersion(result.stdout)
  versionCache.set(key, version)
  return version
}

/** Frameworks move to the newest release. Tooling stays on its current major. */
function versionFor(pin: Pin, currentSpec: string): string {
  const name = pin.versionOf ?? pin.name
  if (pin.group === 'shared' || pin.group === 'bench') {
    const major = currentSpec.replace(/^[\^~]/, '').split('.')[0]
    if (!/^\d+$/.test(major ?? '')) throw new Error(`cannot read a major from ${pin.file} ${pin.name} (${currentSpec})`)
    return latestNpm(name, major)
  }
  return latestNpm(name)
}

async function latestEffectSha(): Promise<string> {
  const response = await fetch('https://api.github.com/repos/Effect-TS/ui/commits?per_page=1', {
    headers: { accept: 'application/vnd.github+json', 'user-agent': 'web-framework-comparison' },
  })
  if (!response.ok) throw new Error(`Effect-TS/ui commits returned ${response.status}`)
  const commits = (await response.json()) as { sha?: string }[]
  const sha = commits[0]?.sha?.slice(0, 7)
  if (!sha) throw new Error('Effect-TS/ui returned no commits')
  return sha
}

function display(plan: Plan | undefined, field: 'from' | 'to'): string {
  if (!plan) return '?'
  if (plan.pin.kind === 'effect-snapshot') {
    if (field === 'to') return plan.to
    return plan.from.match(/@([0-9a-f]{7,40})$/)?.[1] ?? plan.from
  }
  return field === 'from' ? plan.from.replace(/^[\^~]/, '') : plan.to
}

function planBumps(effectSha: string): Plan[] {
  const cache = new Map<string, PackageJson>()
  return pins.map(pin => {
    const pkg = cache.get(pin.file) ?? readPkg(root, pin.file)
    cache.set(pin.file, pkg)
    const from = getSpec(pkg, pin)
    const version = pin.kind === 'effect-snapshot' ? effectSha : versionFor(pin, from)
    return { pin, from, to: version, spec: specFor(from, version, pin.kind) }
  })
}

function printPlan(plans: Plan[]) {
  const seen = new Set<string>()
  for (const plan of plans) {
    const from = display(plan, 'from')
    const key = `${plan.pin.name} ${from} ${plan.to}`
    if (seen.has(key)) continue
    seen.add(key)
    const same = plan.spec === plan.from
    console.log(`  ${plan.pin.name.padEnd(32)} ${from.padEnd(14)} -> ${plan.to}${same ? '  (unchanged)' : ''}`)
  }
}

function applyPlans(plans: Plan[], files?: Set<string>, groups?: Set<string>) {
  const byFile = new Map<string, Plan[]>()
  for (const plan of plans) {
    if (files && !files.has(plan.pin.file)) continue
    if (groups && !groups.has(plan.pin.group)) continue
    const list = byFile.get(plan.pin.file) ?? []
    list.push(plan)
    byFile.set(plan.pin.file, list)
  }
  for (const [file, list] of byFile) {
    const pkg = readPkg(root, file)
    for (const plan of list) setSpec(pkg, plan.pin, plan.spec)
    writePkg(root, file, pkg)
  }
}

function snapshot(files: string[]): Map<string, string> {
  return new Map(files.map(file => [file, readFileSync(join(root, file), 'utf8')]))
}

function restoreFiles(snap: Map<string, string>, files: string[]) {
  for (const file of files) {
    const contents = snap.get(file)
    if (contents === undefined) throw new Error(`no snapshot for ${file}`)
    writeFileSync(join(root, file), contents)
  }
}

function restoreGroups(snap: Map<string, string>, groups: Set<string>) {
  const byFile = new Map<string, Pin[]>()
  for (const pin of pins) {
    if (!groups.has(pin.group)) continue
    const list = byFile.get(pin.file) ?? []
    list.push(pin)
    byFile.set(pin.file, list)
  }
  for (const [file, list] of byFile) {
    const pkg = readPkg(root, file)
    const original = JSON.parse(snap.get(file)!) as PackageJson
    for (const pin of list) setSpec(pkg, pin, getSpec(original, pin))
    writePkg(root, file, pkg)
  }
}

function writeEffectSha(sha: string) {
  const path = join(root, targetsPath)
  writeFileSync(path, replaceEffectVersion(readFileSync(path, 'utf8'), sha))
}

function primary(plans: Plan[], id: string, field: 'from' | 'to'): string {
  const name = primaryPackage[id]
  return display(plans.find(plan => plan.pin.group === id && plan.pin.name === name), field)
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  if (process.argv.includes('--help')) {
    console.log('pnpm monthly\n  bump frameworks, run the benchmark, append history, redraw both charts\n\npnpm monthly -- --dry-run\n  print the versions and stop')
    return
  }

  console.log('Resolving latest releases')
  const effectSha = await latestEffectSha()
  const plans = planBumps(effectSha)
  console.log('\nVersions')
  printPlan(plans)
  if (dryRun) {
    console.log('\nDry run: nothing was installed or measured.')
    return
  }

  const tracked = [...new Set([...pins.map(pin => pin.file), targetsPath, lockPath])]
  const snap = snapshot(tracked)
  const oldSha = effectVersionIn(snap.get(targetsPath)!)

  applyPlans(plans)
  writeEffectSha(effectSha)
  if (!run(['pnpm', 'install'])) {
    console.error('\npnpm install failed. Restoring the previous versions.')
    restoreFiles(snap, tracked)
    run(['pnpm', 'install'])
    process.exit(1)
  }

  const notes: string[] = []
  const reverted = new Set<string>()
  const broken = new Set<string>()

  if (!run(['pnpm', 'build'])) {
    console.log('\nThe full build failed. Building each framework on its own.')
    if (!run(['pnpm', 'generate'])) {
      console.error('generate failed after the version bump. Restoring the previous versions.')
      restoreFiles(snap, tracked)
      run(['pnpm', 'install'])
      process.exit(1)
    }
    for (const build of builds) {
      const label = frameworkLabel[build.id] ?? build.id
      if (run(build.command)) continue
      console.log(`\n${label} failed to build. Restoring its previous packages.`)
      restoreGroups(snap, new Set([build.id]))
      if (build.id === 'effect-ui') restoreFiles(snap, [targetsPath])
      if (!run(['pnpm', 'install'])) {
        broken.add(build.id)
        notes.push(`${label} could not be installed after restoring its previous version.`)
        continue
      }
      if (run(build.command)) {
        reverted.add(build.id)
        notes.push(`${label} stayed on ${primary(plans, build.id, 'from')}; ${primary(plans, build.id, 'to')} failed to build.`)
        continue
      }
      console.log(`\n${label} still failed. Restoring the previous tooling in its app as well.`)
      const files = frameworkFiles[build.id] ?? []
      restoreFiles(snap, files)
      if (build.id === 'effect-ui') restoreFiles(snap, [targetsPath])
      const keep = new Set(builds.map(item => item.id).filter(id => id !== build.id && !reverted.has(id) && !broken.has(id)))
      applyPlans(plans, new Set(files), keep)
      if (!run(['pnpm', 'install']) || !run(build.command)) {
        broken.add(build.id)
        notes.push(`${label} could not be built on the latest version or on the previous one.`)
        continue
      }
      reverted.add(build.id)
      notes.push(
        `${label} stayed on ${primary(plans, build.id, 'from')} with its previous build tooling; ${primary(plans, build.id, 'to')} failed to build.`,
      )
    }
  }

  if (broken.size) {
    console.error(`\nStopping. These frameworks did not build: ${[...broken].join(', ')}`)
    for (const note of notes) console.error(`  ${note}`)
    process.exit(1)
  }
  if (notes.length) {
    console.log('\nVersion bumps that were rolled back:')
    for (const note of notes) console.log(`  ${note}`)
  } else console.log('\nEvery framework built on its latest version.')

  if (!run(['pnpm', 'bench'])) process.exit(1)

  const recorded = appendLatest({ bumpNotes: notes })
  console.log(`\nRecorded ${recorded.date} (${recorded.recordedAt}) in bench/results/history.json`)
  if (!run(['pnpm', 'chart'])) process.exit(1)

  const latest = JSON.parse(readFileSync(join(root, 'bench/results/latest.json'), 'utf8')) as LatestResults
  const history = loadHistory()
  let readme = readFileSync(join(root, readmePath), 'utf8')
  const sha = effectVersionIn(readFileSync(join(root, targetsPath), 'utf8'))
  if (sha !== oldSha) readme = replaceEffectReadme(readme, sha, recorded.date)
  writeFileSync(join(root, readmePath), updateReadme(readme, latest, history))
  console.log('Updated the results tables and the history section in the README.')
  console.log('\nDone. Reread "Things worth noticing" before opening the PR; the script updates numbers, not that commentary.')
}

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) await main()
