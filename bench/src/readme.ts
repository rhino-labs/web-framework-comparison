// Refresh the generated parts of the README from latest.json and history.json.
// The commentary under "Things worth noticing" is left alone.

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { frameworkOrder, root, type History, type HistoryRun } from './history.ts'

type PageStat = { path: string; requests: { js: number; css: number }; jsGzip: number }

type Result = {
  id: string
  label: string
  version: string
  average: Record<string, number>
  pages?: PageStat[]
}

export type LatestResults = {
  date: string
  environment: { node: string; chromium: string; platform: string }
  results: Result[]
}

const mean = (xs: number[]) => xs.reduce((sum, n) => sum + n, 0) / xs.length

/** One decimal, with a bare 0 when the value rounds to zero. Matches the results table. */
export function oneDecimal(n: number): string {
  const rounded = Number(n.toFixed(1))
  if (rounded === 0) return '0'
  return rounded.toFixed(1)
}

const kib = (n: number) => `${Math.round(n)} KiB`
const ms = (n: number) => `${Math.round(n)} ms`

function prefetchCell(metrics: Record<string, number>): string {
  const requests = metrics.jsRequestsPrefetch ?? 0
  const weight = metrics.jsGzipPrefetchKiB ?? 0
  if (Number(requests.toFixed(1)) === 0 && Math.round(weight) === 0) return '0'
  return `+${requests.toFixed(1)} (+${Math.round(weight)} KiB)`
}

function row(cells: string[]): string {
  return `| ${cells.join(' | ')} |`
}

export function renderMainTable(latest: LatestResults): string {
  const header = [
    'Framework',
    'JS requests',
    'CSS requests',
    'JS (gzip)',
    'LCP',
    'INP while loading',
    'INP after load',
    'Prefetched JS',
    'Data requests',
  ]
  const lines = [row(header), row(header.map(() => '---'))]
  for (const result of latest.results) {
    const metrics = result.average
    lines.push(
      row([
        `${result.label} ${result.version}`,
        oneDecimal(metrics.jsRequests),
        oneDecimal(metrics.cssRequests),
        kib(metrics.jsGzipKiB),
        ms(metrics.phoneLcpMs),
        metrics.phoneInpLoadMs === undefined ? '—' : ms(metrics.phoneInpLoadMs),
        metrics.phoneInpMs === undefined ? '—' : ms(metrics.phoneInpMs),
        prefetchCell(metrics),
        oneDecimal(metrics.dataRequests),
      ]),
    )
  }
  return lines.join('\n')
}

/** A generated widget page has a section and a slug. Blog posts are content. */
export function isWidgetPath(path: string): boolean {
  const parts = path.split('/').filter(Boolean)
  return parts.length >= 2 && parts[0] !== 'blog'
}

function splitCell(pages: PageStat[]): string {
  const js = Math.round(mean(pages.map(page => page.requests.js)))
  const css = Math.round(mean(pages.map(page => page.requests.css)))
  const weight = Math.round(mean(pages.map(page => page.jsGzip)) / 1024)
  return `${js} / ${css}, ${weight} KiB`
}

export function renderSplitTable(latest: LatestResults): string {
  const header = ['Framework', 'Content pages: JS / CSS requests, JS gzip', 'Widget pages: JS / CSS requests, JS gzip']
  const lines = [row(header), row(header.map(() => '---'))]
  for (const result of latest.results) {
    const pages = result.pages ?? []
    const content = pages.filter(page => !isWidgetPath(page.path))
    const widgets = pages.filter(page => isWidgetPath(page.path))
    lines.push(row([result.label, content.length ? splitCell(content) : '—', widgets.length ? splitCell(widgets) : '—']))
  }
  return lines.join('\n')
}

export function columnIds(history: History): string[] {
  const present = new Set(history.runs.flatMap(run => run.frameworks.map(framework => framework.id)))
  const known = frameworkOrder.filter(id => present.has(id))
  const extra = [...present].filter(id => !frameworkOrder.includes(id))
  return [...known, ...extra]
}

function labelFor(history: History, id: string): string {
  for (const run of history.runs) {
    const framework = run.frameworks.find(item => item.id === id)
    if (framework) return framework.label
  }
  return id
}

function stamp(run: HistoryRun): string {
  const time = run.recordedAt.split('T')[1]?.slice(0, 5) ?? ''
  const plotted = run.plot ? '' : ' · not plotted'
  return `${run.date} ${time}${plotted}`
}

export function renderVersionTable(history: History): string {
  const ids = columnIds(history)
  const header = ['Run (UTC)', ...ids.map(id => labelFor(history, id))]
  const lines = [row(header), row(header.map(() => '---'))]
  for (const run of history.runs) {
    const version = new Map(run.frameworks.map(framework => [framework.id, framework.version]))
    lines.push(row([stamp(run), ...ids.map(id => version.get(id) ?? '—')]))
  }
  return lines.join('\n')
}

export function latestChartDate(history: History): string {
  const plotted = history.runs.filter(run => run.plot)
  return (plotted.at(-1) ?? history.runs.at(-1))?.date ?? 'undated'
}

export function renderHistoryBlock(history: History): string {
  const date = latestChartDate(history)
  return [
    `![Each framework across committed runs](bench/results/history.png?v=${date})`,
    '',
    renderVersionTable(history),
    '',
    'Vector copy: [`bench/results/history.svg`](bench/results/history.svg).',
  ].join('\n')
}

function replaceMarked(readme: string, name: string, body: string): string {
  const start = `<!-- ${name}:start -->`
  const end = `<!-- ${name}:end -->`
  const pattern = new RegExp(`${start}[\\s\\S]*?${end}`)
  if (!pattern.test(readme)) throw new Error(`README is missing ${start}`)
  return readme.replace(pattern, `${start}\n${body.trim()}\n${end}`)
}

/** Dates in the README are the UTC date of the benchmark timestamp. */
export function updateReadme(readme: string, latest: LatestResults, history: History): string {
  let next = readme
  next = replaceMarked(next, 'results-table', renderMainTable(latest))
  next = replaceMarked(next, 'split-table', renderSplitTable(latest))
  next = replaceMarked(next, 'history', renderHistoryBlock(history))
  const date = latest.date.slice(0, 10)
  next = next.replace(/chart\.png\?v=[^)\s"]+/g, `chart.png?v=${date}`)
  const env = latest.environment
  next = next.replace(
    /Run on \d{4}-\d{2}-\d{2} \([^)]*\)/,
    `Run on ${date} (${env.platform}, Node ${env.node}, Chromium ${env.chromium})`,
  )
  return next
}

export function updateReadmeFile(latest: LatestResults, history: History) {
  const path = join(root, 'README.md')
  writeFileSync(path, updateReadme(readFileSync(path, 'utf8'), latest, history))
}
