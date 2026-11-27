// Committed benchmark history. Each run records the date, the framework
// versions that were measured, and the summary metrics from latest.json.
//
//   node bench/src/history.ts            # append bench/results/latest.json
//   node bench/src/history.ts --recover  # rebuild the seeded runs from git

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
export const historyPath = join(root, 'bench/results/history.json')
export const latestPath = join(root, 'bench/results/latest.json')

/** Stable column order. Frameworks that are not listed are appended. */
export const frameworkOrder = [
  'next',
  'vinext',
  'tanstack-start',
  'react-router',
  'astro',
  'effect-ui',
  'xote',
  'foldkit',
]

/** Older latest.json files used these names for what is now prefetch. */
const legacyMetricNames: Record<string, string> = {
  jsRequestsAfterLoad: 'jsRequestsPrefetch',
  cssRequestsAfterLoad: 'cssRequestsPrefetch',
  jsGzipAfterLoadKiB: 'jsGzipPrefetchKiB',
}

export type PhoneProfile = {
  latencyMs: number
  mbps: number
  cpuSlowdown: number
  viewport: { width: number; height: number }
}

export type FrameworkPoint = {
  id: string
  label: string
  version: string
  /** Summary averages. Field names match the current latest.json. */
  metrics: Record<string, number>
}

export type HistoryRun = {
  /** ISO timestamp from latest.json. Identifies the run. */
  recordedAt: string
  /** UTC calendar date of `recordedAt`. */
  date: string
  /** `git:<sha>` for a seeded run, or `bench/results/latest.json` for a new one. */
  source: string
  /**
   * False when the fixture or the protocol is not the one the chart compares.
   * The run stays in the file.
   */
  plot: boolean
  note?: string
  /** Set by `pnpm monthly` when a framework could not take its latest version. */
  bumpNotes?: string[]
  runsPerPage: number
  phoneRunsPerPage: number
  phoneProfile?: PhoneProfile
  protocol: string | null
  paths: string[]
  environment: { node: string; chromium: string; platform: string }
  frameworks: FrameworkPoint[]
}

export type History = {
  version: 1
  description: string
  runs: HistoryRun[]
}

export type LatestFile = {
  date: string
  runsPerPage: number
  phoneRunsPerPage: number
  phoneProfile?: PhoneProfile
  protocol?: string
  paths: string[]
  environment: { node: string; chromium: string; platform: string }
  results: { id: string; label: string; version: string; average: Record<string, number> }[]
}

export const historyDescription =
  'One entry per benchmark run. `plot: false` keeps a run that used a different fixture or protocol out of the chart. Metric names match bench/results/latest.json; runs that said jsRequestsAfterLoad are stored as jsRequestsPrefetch.'

export function emptyHistory(): History {
  return { version: 1, description: historyDescription, runs: [] }
}

/** Copy numeric averages, renaming the pre-prefetch field names. */
export function metricsOf(average: Record<string, unknown>): Record<string, number> {
  const metrics: Record<string, number> = {}
  for (const [key, value] of Object.entries(average)) {
    if (typeof value !== 'number' || Number.isNaN(value) || legacyMetricNames[key]) continue
    metrics[key] = value
  }
  for (const [key, value] of Object.entries(average)) {
    const name = legacyMetricNames[key]
    if (!name || typeof value !== 'number' || Number.isNaN(value)) continue
    if (metrics[name] === undefined) metrics[name] = value
  }
  return metrics
}

export function runFromLatest(
  latest: LatestFile,
  extra: { source: string; plot?: boolean; note?: string; bumpNotes?: string[] },
): HistoryRun {
  const run: HistoryRun = {
    recordedAt: latest.date,
    date: latest.date.slice(0, 10),
    source: extra.source,
    plot: extra.plot ?? true,
    runsPerPage: latest.runsPerPage,
    phoneRunsPerPage: latest.phoneRunsPerPage,
    protocol: latest.protocol ?? null,
    paths: latest.paths,
    environment: latest.environment,
    frameworks: latest.results.map(result => ({
      id: result.id,
      label: result.label,
      version: result.version,
      metrics: metricsOf(result.average),
    })),
  }
  if (latest.phoneProfile) run.phoneProfile = latest.phoneProfile
  if (extra.note) run.note = extra.note
  if (extra.bumpNotes?.length) run.bumpNotes = extra.bumpNotes
  return run
}

export function upsertRun(history: History, run: HistoryRun): History {
  const runs = history.runs.filter(existing => existing.recordedAt !== run.recordedAt)
  runs.push(run)
  runs.sort((a, b) => (a.recordedAt < b.recordedAt ? -1 : 1))
  return { ...history, runs }
}

export function loadHistory(): History {
  const history = JSON.parse(readFileSync(historyPath, 'utf8')) as History
  if (history.version !== 1) throw new Error(`unsupported history version: ${history.version}`)
  return history
}

export function saveHistory(history: History) {
  mkdirSync(dirname(historyPath), { recursive: true })
  const runs = [...history.runs].sort((a, b) => (a.recordedAt < b.recordedAt ? -1 : 1))
  writeFileSync(historyPath, JSON.stringify({ ...history, runs }, null, 2) + '\n')
}

/**
 * Append `bench/results/latest.json`. The same timestamp replaces the metrics
 * in place and keeps the note and source already stored for that run, so
 * re-appending the seeded file does not drop its git provenance.
 */
export function appendLatest(extra?: { bumpNotes?: string[]; source?: string }): HistoryRun {
  const latest = JSON.parse(readFileSync(latestPath, 'utf8')) as LatestFile
  const history = existsSync(historyPath) ? loadHistory() : emptyHistory()
  const previous = history.runs.find(run => run.recordedAt === latest.date)
  const run = runFromLatest(latest, {
    source: extra?.source ?? previous?.source ?? 'bench/results/latest.json',
    plot: previous?.plot ?? true,
    note: previous?.note,
    bumpNotes: extra?.bumpNotes?.length ? extra.bumpNotes : previous?.bumpNotes,
  })
  saveHistory(upsertRun(history, run))
  return run
}

type Seed = { sha: string; plot: boolean; note: string }

/** Runs recovered from git. The initial commit is kept and not plotted. */
const seeds: Seed[] = [
  {
    sha: '29d444d',
    plot: false,
    note: '6 content pages only, no HTTP/2 proxy, and responses were not re-gzipped to one level. Foldkit answered the home page for every path. Not plotted; see Corrections in the README.',
  },
  {
    sha: 'dc09d4d',
    plot: true,
    note: 'First run of the 153-page fixture over the HTTP/2 + gzip proxy. 5 phone loads per page.',
  },
  {
    sha: 'e5e82ec',
    plot: true,
    note: 'Astro 7.4.2 and Xote 7.1.0 joined. The other frameworks are the same versions as the previous run, measured again.',
  },
  {
    sha: 'f1302ff',
    plot: true,
    note: 'React Router updated from 7.18.4 to 8.5.0. The other frameworks are the same versions as the previous run.',
  },
  {
    sha: '4c34a68',
    plot: true,
    note: 'Versions current in this commit. Foldkit was replaced by Effect UI. INP was recorded for the first time, and phone medians use 15 loads per page.',
  },
]

export function recoveredRuns(): HistoryRun[] {
  return seeds.map(seed => {
    const json = execFileSync('git', ['show', `${seed.sha}:bench/results/latest.json`], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    })
    return runFromLatest(JSON.parse(json) as LatestFile, {
      source: `git:${seed.sha}`,
      plot: seed.plot,
      note: seed.note,
    })
  })
}

/** Rebuild the seeded runs from git and keep any later runs already in the file. */
export function recoverFromGit(): History {
  const recovered = recoveredRuns()
  const seen = new Set(recovered.map(run => run.recordedAt))
  const extra = existsSync(historyPath) ? loadHistory().runs.filter(run => !seen.has(run.recordedAt)) : []
  return { ...emptyHistory(), runs: [...recovered, ...extra].sort((a, b) => (a.recordedAt < b.recordedAt ? -1 : 1)) }
}

const invoked = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (invoked) {
  const recover = process.argv.includes('--recover')
  if (recover) {
    saveHistory(recoverFromGit())
    console.log(`wrote ${historyPath} (${loadHistory().runs.length} runs, recovered from git)`)
  } else {
    const run = appendLatest()
    console.log(`recorded ${run.date} ${run.recordedAt} (${run.frameworks.length} frameworks) in ${historyPath}`)
  }
}
