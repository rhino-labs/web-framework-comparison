// Starts each framework's production server behind the same HTTP/2 proxy,
// loads every benchmark page in a fresh (cold-cache) browser context, and
// records the requests it makes, split into those made while the page loads
// and those made after the load event (link prefetching, idle work). Then
// loads each page again on a simulated phone (4G network + 4x CPU throttle)
// and records LCP.
//
//   node bench/src/run.ts [--only next,foldkit] [--runs 3] [--phone-runs 5]

import { spawn, type ChildProcess } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { gzipSync } from 'node:zlib'
import { chromium, type Browser } from 'playwright'
// relative import: Node won't strip types from .ts files inside node_modules
import { benchmarkPaths } from '../../packages/content/src/server.ts'
import { startProxy } from './h2proxy.ts'
import { targets, type Target } from './targets.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

const { values: args } = parseArgs({
  options: {
    only: { type: 'string' },
    runs: { type: 'string', default: '3' },
    settle: { type: 'string', default: '1000' },
    'phone-runs': { type: 'string', default: '5' },
  },
})
const phoneRuns = Number(args['phone-runs'])

// Same profile as the vinext 1.3 post: 150 ms RTT, 5 Mbit/s, 4x CPU slowdown.
const phoneProfile = { latencyMs: 150, mbps: 5, cpuSlowdown: 4, viewport: { width: 390, height: 844 } }
const runs = Number(args.runs)
const settleMs = Number(args.settle)
const selected = args.only ? targets.filter(t => args.only!.split(',').includes(t.id)) : targets

type Kind = 'js' | 'css' | 'document' | 'data' | 'other'

/** `load`: started before the load event. `after-load`: prefetches and other
 * work the page started once it had loaded. */
type Phase = 'load' | 'after-load'

type RequestRecord = { url: string; kind: Kind; phase: Phase; status: number; rawBytes: number; gzipBytes: number }

type PageResult = {
  path: string
  /** requests made while the page loads */
  requests: Record<Kind, number>
  /** requests made after the load event */
  afterLoad: Record<Kind, number>
  totalRequests: number
  jsGzip: number
  jsRaw: number
  jsGzipAfterLoad: number
  cssGzip: number
  htmlGzip: number
  /** per-run detail of the first run, for debugging */
  sample: RequestRecord[]
}

const classify = (resourceType: string, contentType: string, url: string): Kind => {
  if (resourceType === 'document') return 'document'
  if (resourceType === 'script' || /javascript/.test(contentType)) return 'js'
  if (resourceType === 'stylesheet' || /text\/css/.test(contentType)) return 'css'
  // Next/vinext RSC prefetches, TanStack server functions, JSON payloads
  if (resourceType === 'fetch' || resourceType === 'xhr' || /x-component|json/.test(contentType) || /_rsc=/.test(url)) return 'data'
  return 'other'
}

const gz = (buf: Buffer) => gzipSync(buf, { level: 6 }).length

async function measurePage(browser: Browser, origin: string, path: string): Promise<RequestRecord[]> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, ignoreHTTPSErrors: true })
  await context.addInitScript(() => performance.setResourceTimingBufferSize(5000))
  const page = await context.newPage()
  const pending: Promise<Omit<RequestRecord, 'phase'> | undefined>[] = []
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => m.type() === 'error' && errors.push(m.text()))
  page.on('response', response => {
    pending.push(
      (async () => {
        const req = response.request()
        const kind = classify(req.resourceType(), response.headers()['content-type'] ?? '', req.url())
        // Bodies are re-gzipped locally so every server is compared on equal
        // terms, regardless of whether/how it compresses responses.
        const body = await response.body().catch(() => Buffer.alloc(0))
        return { url: req.url(), kind, status: response.status(), rawBytes: body.length, gzipBytes: body.length ? gz(body) : 0 }
      })(),
    )
  })
  await page.goto(origin + path, { waitUntil: 'networkidle' })
  // let idle-time work (viewport link prefetching, lazy chunks) happen
  await page.waitForTimeout(settleMs)
  await page.waitForLoadState('networkidle')
  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    return {
      loadEventStart: nav.loadEventStart,
      protocol: nav.nextHopProtocol,
      starts: (performance.getEntriesByType('resource') as PerformanceResourceTiming[]).map(e => [e.name, e.startTime] as const),
    }
  })
  if (timing.protocol !== 'h2') errors.push(`served over ${timing.protocol}, expected h2`)
  // first start time per URL; anything the page requested after this point
  // (e.g. after the toggle click below) counts as after-load
  const startOf = new Map<string, number>()
  for (const [url, start] of timing.starts) if (!startOf.has(url)) startOf.set(url, start)
  // sanity check: the interactive island must work, i.e. the page hydrated
  const toggle = page.getByRole('button', { name: /mode$/ })
  await toggle.click()
  const hydrated = (await page.locator('html').getAttribute('data-theme')) === 'dark'
  if (!hydrated) errors.push('theme toggle did not work (page not hydrated?)')
  if (errors.length) console.warn(`  ! ${path}: ${[...new Set(errors)].join(' | ')}`)
  const records = (await Promise.all(pending))
    .filter(r => !!r)
    .map((r): RequestRecord => {
      const start = r.kind === 'document' ? 0 : startOf.get(r.url)
      return { ...r, phase: start !== undefined && start < timing.loadEventStart ? 'load' : 'after-load' }
    })
  await context.close()
  return records
}

type PhoneRun = { lcp: number; fcp: number; load: number }

async function measurePhone(browser: Browser, origin: string, path: string): Promise<PhoneRun> {
  const context = await browser.newContext({
    viewport: phoneProfile.viewport,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    ignoreHTTPSErrors: true,
  })
  // record LCP candidates from the very start of the navigation
  await context.addInitScript(() => {
    const w = window as unknown as { __lcp: number }
    w.__lcp = 0
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) w.__lcp = entry.startTime
    }).observe({ type: 'largest-contentful-paint', buffered: true })
  })
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
  const bytesPerSecond = (phoneProfile.mbps * 1_000_000) / 8
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: phoneProfile.latencyMs,
    downloadThroughput: bytesPerSecond,
    uploadThroughput: bytesPerSecond,
  })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: phoneProfile.cpuSlowdown })
  await page.goto(origin + path, { waitUntil: 'load', timeout: 60_000 })
  await page.waitForLoadState('networkidle')
  const result = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0
    return { lcp: (window as unknown as { __lcp: number }).__lcp, fcp, load: nav.loadEventEnd }
  })
  await context.close()
  return result
}

const median = (xs: number[]) => {
  const sorted = [...xs].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

const summarize = (path: string, all: RequestRecord[][]): PageResult => {
  const avg = (f: (rs: RequestRecord[]) => number) => all.reduce((n, rs) => n + f(rs), 0) / all.length
  const count = (kind: Kind, phase: Phase) => avg(rs => rs.filter(r => r.kind === kind && r.phase === phase).length)
  const bytes = (kind: Kind, key: 'gzipBytes' | 'rawBytes', phase: Phase = 'load') =>
    avg(rs => rs.filter(r => r.kind === kind && r.phase === phase).reduce((n, r) => n + r[key], 0))
  const kinds = (phase: Phase) =>
    Object.fromEntries((['js', 'css', 'document', 'data', 'other'] as const).map(k => [k, count(k, phase)])) as Record<Kind, number>
  const requests = kinds('load')
  return {
    path,
    requests,
    afterLoad: kinds('after-load'),
    totalRequests: Object.values(requests).reduce((a, b) => a + b, 0),
    jsGzip: bytes('js', 'gzipBytes'),
    jsRaw: bytes('js', 'rawBytes'),
    jsGzipAfterLoad: bytes('js', 'gzipBytes', 'after-load'),
    cssGzip: bytes('css', 'gzipBytes'),
    htmlGzip: bytes('document', 'gzipBytes'),
    sample: all[0]!.map(r => ({ ...r, url: r.url.replace(/^https?:\/\/[^/]+/, '') })),
  }
}

const versionOf = (t: Target) => {
  // walk up from the app dir like Node resolution does (some packages don't
  // export ./package.json, so require.resolve can't be used)
  for (let dir = join(root, t.cwd); dir !== dirname(dir); dir = dirname(dir)) {
    try {
      return JSON.parse(readFileSync(join(dir, 'node_modules', t.versionOf, 'package.json'), 'utf8')).version as string
    } catch {}
  }
  return 'unknown'
}

async function startServer(t: Target): Promise<ChildProcess> {
  const [cmd, ...rest] = t.start.replace('{port}', String(t.port)).split(' ')
  const child = spawn(cmd!, rest, {
    cwd: join(root, t.cwd),
    env: { ...process.env, NODE_ENV: 'production', PORT: String(t.port), NEXT_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  })
  let log = ''
  child.stdout!.on('data', d => (log += d))
  child.stderr!.on('data', d => (log += d))
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`${t.id} server exited:\n${log}`)
    try {
      const res = await fetch(`http://localhost:${t.port}/`)
      if (res.ok) return child
    } catch {}
    await new Promise(r => setTimeout(r, 250))
  }
  stopServer(child)
  throw new Error(`${t.id} server did not become ready on :${t.port}\n${log}`)
}

const stopServer = (child: ChildProcess) => {
  try {
    process.kill(-child.pid!, 'SIGTERM')
  } catch {}
}

const browser = await chromium.launch({ args: ['--ignore-certificate-errors'] })
const browserVersion = browser.version()
const results = []
try {
  for (const t of selected) {
    const version = versionOf(t)
    console.log(`\n▶ ${t.label} ${version}`)
    const server = await startServer(t)
    const proxy = await startProxy(t.port, t.port + 1000)
    try {
      const origin = proxy.origin
      // warm the server once so lazy server compilation doesn't skew anything
      for (const path of benchmarkPaths) await fetch(`http://localhost:${t.port}${path}`)
      const pages: (PageResult & { phone: { lcp: number; fcp: number; load: number; runs: PhoneRun[] } })[] = []
      for (const path of benchmarkPaths) {
        const all: RequestRecord[][] = []
        for (let i = 0; i < runs; i++) all.push(await measurePage(browser, origin, path))
        const failed = all[0]!.filter(r => r.status >= 400)
        if (failed.length) console.warn(`  ! ${path}: ${failed.map(r => `${r.status} ${r.url}`).join(', ')}`)
        const phone: PhoneRun[] = []
        for (let i = 0; i < phoneRuns; i++) phone.push(await measurePhone(browser, origin, path))
        const p = {
          ...summarize(path, all),
          phone: {
            lcp: median(phone.map(r => r.lcp)),
            fcp: median(phone.map(r => r.fcp)),
            load: median(phone.map(r => r.load)),
            runs: phone,
          },
        }
        pages.push(p)
        console.log(
          `  ${path.padEnd(38)} js ${p.requests.js.toFixed(1).padStart(4)} (+${p.afterLoad.js.toFixed(1)})  css ${p.requests.css.toFixed(1).padStart(4)}  data ${(p.requests.data + p.afterLoad.data).toFixed(1).padStart(4)}  js-gz ${(p.jsGzip / 1024).toFixed(1).padStart(6)} KiB (+${(p.jsGzipAfterLoad / 1024).toFixed(1)})  phone LCP ${Math.round(p.phone.lcp).toString().padStart(5)} ms`,
        )
      }
      const mean = (f: (p: PageResult) => number) => pages.reduce((n, p) => n + f(p), 0) / pages.length
      results.push({
        id: t.id,
        label: t.label,
        version,
        average: {
          jsRequests: mean(p => p.requests.js),
          cssRequests: mean(p => p.requests.css),
          jsRequestsAfterLoad: mean(p => p.afterLoad.js),
          cssRequestsAfterLoad: mean(p => p.afterLoad.css),
          dataRequests: mean(p => p.requests.data + p.afterLoad.data),
          totalRequests: mean(p => p.totalRequests),
          jsGzipKiB: mean(p => p.jsGzip) / 1024,
          jsRawKiB: mean(p => p.jsRaw) / 1024,
          jsGzipAfterLoadKiB: mean(p => p.jsGzipAfterLoad) / 1024,
          cssGzipKiB: mean(p => p.cssGzip) / 1024,
          htmlGzipKiB: mean(p => p.htmlGzip) / 1024,
          phoneLcpMs: mean(p => p.phone.lcp),
          phoneFcpMs: mean(p => p.phone.fcp),
          phoneLoadMs: mean(p => p.phone.load),
        },
        pages,
      })
    } finally {
      await proxy.close()
      stopServer(server)
    }
  }
} finally {
  await browser.close()
}

const out = {
  date: new Date().toISOString(),
  runsPerPage: runs,
  phoneRunsPerPage: phoneRuns,
  phoneProfile,
  protocol: 'h2 (local TLS proxy)',
  paths: benchmarkPaths,
  environment: { node: process.version, chromium: browserVersion, platform: process.platform },
  results,
}
mkdirSync(join(root, 'bench/results'), { recursive: true })
writeFileSync(join(root, 'bench/results/latest.json'), JSON.stringify(out, null, 2))

console.log('\nAverage per page')
console.table(
  Object.fromEntries(
    results.map(r => [
      `${r.label} ${r.version}`,
      {
        'JS reqs': +r.average.jsRequests.toFixed(1),
        'CSS reqs': +r.average.cssRequests.toFixed(1),
        'JS after load': +r.average.jsRequestsAfterLoad.toFixed(1),
        'data reqs': +r.average.dataRequests.toFixed(1),
        'JS gzip KiB': Math.round(r.average.jsGzipKiB),
        'CSS gzip KiB': +r.average.cssGzipKiB.toFixed(1),
        'phone LCP ms': Math.round(r.average.phoneLcpMs),
        'phone load ms': Math.round(r.average.phoneLoadMs),
      },
    ]),
  ),
)
console.log('wrote bench/results/latest.json')
