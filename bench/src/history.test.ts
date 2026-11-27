import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { loadHistory, metricsOf, recoveredRuns, type History, type HistoryRun } from './history.ts'
import { effectVersionIn, maxStableVersion, replaceEffectVersion, specFor } from './pins.ts'
import { isWidgetPath, renderHistoryBlock, renderMainTable, renderSplitTable, updateReadme, type LatestResults } from './readme.ts'
import { chartFoot, niceScale, renderHistorySvg } from './timeseries.ts'

test('renames the old prefetch fields and keeps the current name when both exist', () => {
  const metrics = metricsOf({ jsRequests: 6.3, jsRequestsAfterLoad: 2.9, jsGzipAfterLoadKiB: 6.3, note: 'skip' })
  assert.equal(metrics.jsRequests, 6.3)
  assert.equal(metrics.jsRequestsPrefetch, 2.9)
  assert.equal(metrics.jsGzipPrefetchKiB, 6.3)
  assert.equal('jsRequestsAfterLoad' in metrics, false)
  assert.equal('note' in metrics, false)
  const current = metricsOf({ jsRequestsPrefetch: 1, jsRequestsAfterLoad: 9 })
  assert.equal(current.jsRequestsPrefetch, 1)
})

test('a major-range npm listing yields the highest stable version', () => {
  const listed = "react@19.1.10 '19.1.10'\nreact@19.3.1 '19.3.1'\nreact@19.3.2-rc.0 '19.3.2-rc.0'\n"
  assert.equal(maxStableVersion(listed), '19.3.1')
  assert.equal(maxStableVersion('19.3.1\n'), '19.3.1')
})

test('version specs keep their prefix, and the Effect snapshot keeps its URL', () => {
  assert.equal(specFor('16.4.6', '16.5.0'), '16.5.0')
  assert.equal(specFor('^8.5.3', '8.6.0'), '^8.6.0')
  assert.equal(specFor('~1.2.3', '1.2.4'), '~1.2.4')
  assert.equal(
    specFor('https://pkg.pr.new/Effect-TS/ui/@effect/ui@33dbab6', 'abc1234', 'effect-snapshot'),
    'https://pkg.pr.new/Effect-TS/ui/@effect/ui@abc1234',
  )
})

test('the Effect UI sha in targets.ts round-trips', () => {
  const source = readFileSync(new URL('./targets.ts', import.meta.url), 'utf8')
  assert.equal(effectVersionIn(source), '33dbab6')
  const next = replaceEffectVersion(source, 'abc1234')
  assert.equal(effectVersionIn(next), 'abc1234')
  assert.equal(next.includes("version: '33dbab6'"), false)
})

test('axes leave headroom above the largest point', () => {
  assert.deepEqual(niceScale(16.6), { max: 20, step: 5 })
  assert.deepEqual(niceScale(159.3), { max: 200, step: 50 })
  assert.deepEqual(niceScale(510), { max: 600, step: 200 })
  assert.deepEqual(niceScale(197.6), { max: 250, step: 50 })
  assert.deepEqual(niceScale(0), { max: 1, step: 1 })
})

test('the results tables match the README', () => {
  const latest = JSON.parse(readFileSync(new URL('../results/latest.json', import.meta.url), 'utf8')) as LatestResults
  const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8')
  assert.equal(readme.includes(renderMainTable(latest)), true)
  assert.equal(readme.includes(renderSplitTable(latest)), true)
  assert.equal(isWidgetPath('/docs/token-runtime-runtime'), true)
  assert.equal(isWidgetPath('/blog/shipping-less-javascript'), false)
  assert.equal(isWidgetPath('/docs'), false)
})

const point = (id: string, label: string, version: string, metrics: Record<string, number>) => ({ id, label, version, metrics })

function run(partial: Partial<HistoryRun> & Pick<HistoryRun, 'recordedAt' | 'frameworks'>): HistoryRun {
  return {
    date: partial.recordedAt.slice(0, 10),
    source: 'test',
    plot: true,
    runsPerPage: 3,
    phoneRunsPerPage: 15,
    protocol: 'h2 (local TLS proxy)',
    paths: ['/', '/blog'],
    environment: { node: 'v24.0.0', chromium: '1', platform: 'linux' },
    ...partial,
  }
}

test('one plotted run is a column of dots, with no line and no unplotted value', () => {
  const history: History = {
    version: 1,
    description: '',
    runs: [
      run({
        recordedAt: '2026-10-26T04:14:36.193Z',
        plot: false,
        frameworks: [point('next', 'Next.js', '16.4.3', { jsRequests: 1, cssRequests: 1, jsGzipKiB: 9999, phoneLcpMs: 1 })],
      }),
      run({
        recordedAt: '2026-11-27T01:12:22.483Z',
        frameworks: [
          point('next', 'Next.js', '16.4.6', { jsRequests: 6.3, cssRequests: 3, jsGzipKiB: 138.9, phoneLcpMs: 490, phoneInpLoadMs: 197.6 }),
          point('astro', 'Astro', '7.4.13', { jsRequests: 16.6, cssRequests: 0, jsGzipKiB: 73.3, phoneLcpMs: 254.8, phoneInpLoadMs: 14.4 }),
        ],
      }),
    ],
  }
  const { svg } = renderHistorySvg(history)
  assert.equal(svg.includes('NaN'), false)
  assert.equal(svg.includes('<polyline'), false)
  assert.equal(svg.includes('9999'), false)
  const xs = [...svg.matchAll(/data-metric="requests"[^>]*cx="([^"]+)"/g)].map(match => match[1])
  assert.equal(xs.length, 2)
  assert.equal(new Set(xs).size, 1)
  const next = svg.match(/data-id="next" data-metric="js"[^>]*cy="([^"]+)"/)
  const astro = svg.match(/data-id="astro" data-metric="js"[^>]*cy="([^"]+)"/)
  assert.ok(next && astro)
  assert.ok(Number(next[1]) < Number(astro[1]), 'the heavier bundle sits higher on the chart')
  assert.match(chartFoot(history), /Not plotted: 2026-10-26/)
  assert.match(chartFoot(history), /INP while loading starts on 2026-11-27/)
})

test('several runs connect a line and leave a gap where a framework is missing', () => {
  const metrics = { jsRequests: 6, cssRequests: 3, jsGzipKiB: 140, phoneLcpMs: 500 }
  const history: History = {
    version: 1,
    description: '',
    runs: [
      run({ recordedAt: '2026-10-27T00:18:11.011Z', phoneRunsPerPage: 5, frameworks: [point('next', 'Next.js', '16.4.3', metrics)] }),
      run({
        recordedAt: '2026-11-27T01:12:22.483Z',
        frameworks: [point('next', 'Next.js', '16.4.6', { ...metrics, jsGzipKiB: 130 }), point('astro', 'Astro', '7.4.13', { ...metrics, jsRequests: 16, cssRequests: 0, jsGzipKiB: 73 })],
      }),
    ],
  }
  const { svg } = renderHistorySvg(history)
  assert.match(svg, /<polyline data-id="next" data-metric="js"/)
  assert.equal(svg.includes('<polyline data-id="astro"'), false)
  const circles = [...svg.matchAll(/<circle data-id="astro"/g)]
  assert.ok(circles.length >= 3)
})

test('the README history section matches history.json, and a refresh keeps the commentary', () => {
  const latest = JSON.parse(readFileSync(new URL('../results/latest.json', import.meta.url), 'utf8')) as LatestResults
  const history = loadHistory()
  const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8')
  assert.equal(readme.includes(renderHistoryBlock(history)), true)
  const next = updateReadme(readme, latest, history)
  assert.match(next, /Things worth noticing/)
  assert.match(next, /<!-- history:start -->/)
  assert.match(next, /<!-- results-table:start -->/)
  assert.match(next, /Run on 2026-11-27 \(darwin, Node v24.21.0, Chromium 156.0.8078.4\)/)
  assert.match(next, /chart\.png\?v=2026-11-27/)
})

test('recovered git history keeps the current run and the incomparable first run', () => {
  const runs = recoveredRuns()
  assert.equal(runs[0]?.plot, false)
  assert.equal(runs[0]?.date, '2026-10-26')
  assert.equal(runs[0]?.frameworks.some(framework => framework.id === 'foldkit'), true)
  const current = runs.at(-1)!
  assert.equal(current.date, '2026-11-27')
  assert.equal(current.source, 'git:4c34a68')
  assert.equal(current.frameworks.find(framework => framework.id === 'next')?.version, '16.4.6')
  assert.equal(Math.round(current.frameworks.find(framework => framework.id === 'next')!.metrics.jsGzipKiB), 139)
  assert.equal(current.frameworks.find(framework => framework.id === 'effect-ui')?.version, '33dbab6')
  const router = runs.find(run => run.frameworks.some(framework => framework.id === 'react-router' && framework.version === '8.5.0'))
  assert.ok(router)
  assert.equal(router!.plot, true)
  const scaled = runs.find(run => run.source === 'git:dc09d4d')
  assert.equal(scaled?.frameworks.find(framework => framework.id === 'next')?.metrics.jsRequestsPrefetch, 2.9)
})
