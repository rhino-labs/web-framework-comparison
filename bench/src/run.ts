// Starts each framework's production server behind the same HTTP/2 proxy,
// loads every benchmark page in a fresh (cold-cache) browser context, and
// records the requests it makes, split into those the page needs (including
// code an island or lazy hydration imports after the load event) and
// prefetching for other routes. Then
// loads each page again on a simulated phone (4G network + 4x CPU throttle),
// records LCP, runs a fixed script of taps and key presses and records INP.
// The phone runs are interleaved: every round measures each page of each
// framework once, so drift in the machine's state hits all of them alike.
//
//   node bench/src/run.ts [--only next,effect-ui] [--runs 3] [--phone-runs 15]

import { spawn, type ChildProcess } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { gzipSync } from 'node:zlib'
import { chromium, type Browser, type ElementHandle, type Page } from 'playwright'
// relative import: Node won't strip types from .ts files inside node_modules
import { benchmarkPaths, headingFor } from '../../packages/content/src/server.ts'
import { startProxy } from './h2proxy.ts'
import { targets, type Target } from './targets.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

const { values: args } = parseArgs({
  options: {
    only: { type: 'string' },
    runs: { type: 'string', default: '3' },
    settle: { type: 'string', default: '1000' },
    'phone-runs': { type: 'string', default: '15' },
  },
})
const phoneRuns = Number(args['phone-runs'])

// Same profile as the vinext 1.3 post: 150 ms RTT, 5 Mbit/s, 4x CPU slowdown.
const phoneProfile = { latencyMs: 150, mbps: 5, cpuSlowdown: 4, viewport: { width: 390, height: 844 } }
const runs = Number(args.runs)
const settleMs = Number(args.settle)
const selected = args.only ? targets.filter(t => args.only!.split(',').includes(t.id)) : targets

type Kind = 'js' | 'css' | 'document' | 'data' | 'other'

/** `prefetch`: started after the load event and after the page's first
 * fetch/XHR request, i.e. code pulled in by route prefetching (Next/vinext
 * fetch a route's RSC payload, then its chunks). Everything else is `page`,
 * including code a page imports after load to hydrate (Astro islands). */
type Phase = 'page' | 'prefetch'

type RequestRecord = { url: string; kind: Kind; phase: Phase; status: number; rawBytes: number; gzipBytes: number }

type PageResult = {
  path: string
  /** requests the page itself makes */
  requests: Record<Kind, number>
  /** requests made by prefetching other routes */
  prefetch: Record<Kind, number>
  totalRequests: number
  jsGzip: number
  jsRaw: number
  jsGzipPrefetch: number
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
      firstFetchStart: Math.min(
        ...(performance.getEntriesByType('resource') as PerformanceResourceTiming[])
          .filter(e => e.initiatorType === 'fetch' || e.initiatorType === 'xmlhttprequest')
          .map(e => e.startTime),
      ),
    }
  })
  if (timing.protocol !== 'h2') errors.push(`served over ${timing.protocol}, expected h2`)
  // the server must have served this page, not a fallback
  const heading = (await page.locator('h1').first().textContent())?.trim()
  if (heading !== headingFor(path)) errors.push(`wrong page: <h1> is "${heading}", expected "${headingFor(path)}"`)
  // first start time per URL. Requests the resource timings don't list (e.g.
  // made by the toggle click below) aren't part of the page load.
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
      const isPrefetch = start === undefined || (start > timing.loadEventStart && start > timing.firstFetchStart)
      return { ...r, phase: isPrefetch ? 'prefetch' : 'page' }
    })
  await context.close()
  return records
}

type PhoneRun = {
  lcp: number
  fcp: number
  load: number
  /** worst interaction of the script, as the Event Timing API reports it */
  inp: number
  /** interactions the browser reported (those under 16 ms are not reported) */
  interactions: number
  /** the script step that produced `inp` */
  slowest: string
  /** worst interaction while pressing a key throughout a second cold load */
  inpLoad: number
  /** key presses made during that load */
  loadTaps: number
}

type TimedEvent = { id: number; start: number; duration: number }

/** An interaction is several events (pointerdown, pointerup, click) with one
 * id; its duration is the longest of them. */
const interactionsOf = (events: TimedEvent[]) => {
  const byId = new Map<number, { start: number; duration: number }>()
  for (const e of events) {
    const seen = byId.get(e.id)
    if (!seen) byId.set(e.id, { start: e.start, duration: e.duration })
    else byId.set(e.id, { start: Math.min(seen.start, e.start), duration: Math.max(seen.duration, e.duration) })
  }
  return [...byId.values()].sort((a, b) => b.duration - a.duration)
}
const readEvents = (page: Page) => page.evaluate(() => (window as unknown as { __events: TimedEvent[] }).__events)

/** How many of the page's own buttons the interaction script taps, after the
 * site-wide controls. */
const pageButtons = 10

/** A cold-cache page on the simulated phone, recording LCP and interactions. */
async function openPhonePage(browser: Browser) {
  const context = await browser.newContext({
    viewport: phoneProfile.viewport,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    ignoreHTTPSErrors: true,
  })
  // record LCP candidates and interactions from the very start of the navigation
  await context.addInitScript(() => {
    const w = window as unknown as { __lcp: number; __events: { id: number; start: number; duration: number }[] }
    w.__lcp = 0
    w.__events = []
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) w.__lcp = entry.startTime
    }).observe({ type: 'largest-contentful-paint', buffered: true })
    new PerformanceObserver(list => {
      for (const entry of list.getEntries() as (PerformanceEntry & { interactionId?: number })[])
        if (entry.interactionId) w.__events.push({ id: entry.interactionId, start: entry.startTime, duration: entry.duration })
      // 16 ms is the lowest threshold the API accepts
    }).observe({ type: 'event', durationThreshold: 16, buffered: true } as PerformanceObserverInit)
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
  return { context, page }
}

/** Loads the page cold and presses a key every 50 ms until the page is idle.
 * Nothing has focus, so the key does nothing (a tap could land on a link).
 * A press that arrives while the main thread is busy parsing, hydrating or
 * rendering waits for it, so the worst press shows how long the page can
 * leave input unanswered while it starts up. */
async function measureLoadTaps(browser: Browser, origin: string, path: string) {
  const { context, page } = await openPhonePage(browser)
  let idle = false
  const loaded = page
    .goto(origin + path, { waitUntil: 'load', timeout: 60_000 })
    .then(() => page.waitForLoadState('networkidle'))
    .then(() => page.waitForTimeout(300))
    .finally(() => (idle = true))
  // from the first paint on: before it there is nothing to interact with
  await page.waitForSelector('h1', { timeout: 60_000 })
  let taps = 0
  while (!idle) {
    await page.keyboard.press('a')
    taps++
    await page.waitForTimeout(50)
  }
  await loaded
  await page.waitForTimeout(200)
  const worst = interactionsOf(await readEvents(page))[0]
  await context.close()
  return { inpLoad: worst?.duration ?? 0, loadTaps: taps }
}

async function measurePhone(browser: Browser, origin: string, path: string): Promise<PhoneRun> {
  const { context, page } = await openPhonePage(browser)
  await page.goto(origin + path, { waitUntil: 'load', timeout: 60_000 })
  await page.waitForLoadState('networkidle')
  // read before the first input: the browser stops reporting LCP after it
  const result = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0
    return { lcp: (window as unknown as { __lcp: number }).__lcp, fcp, load: nav.loadEventEnd }
  })

  // The interaction script, still under the CPU throttle. Each step waits for
  // the frame after it, so one interaction never queues behind another.
  const steps: { name: string; at: number }[] = []
  const failed: string[] = []
  const step = async (name: string, action: () => Promise<unknown>) => {
    steps.push({ name, at: await page.evaluate(() => performance.now()) })
    try {
      await action()
    } catch (e) {
      failed.push(`${name} (${String((e as Error).message).split('\n')[0]})`)
    }
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(undefined)))))
  }
  // Taps go to coordinates: the page lays out a little wider than the phone's
  // screen, which Playwright's own hit testing doesn't handle.
  const tapElement = async (el: ElementHandle<Element> | null) => {
    if (!el) throw new Error('not found')
    const point = await el.evaluate(e => {
      // fixed elements (header, back-to-top) can cover one position but not all
      for (const block of ['center', 'end', 'start'] as const) {
        e.scrollIntoView({ block, inline: 'center', behavior: 'instant' })
        const r = e.getBoundingClientRect()
        const x = r.x + r.width / 2
        const y = r.y + r.height / 2
        const view = window.visualViewport!
        if (e.contains(document.elementFromPoint(x, y))) return { x: x - view.offsetLeft, y: y - view.offsetTop, hit: true }
      }
      return { x: 0, y: 0, hit: false }
    })
    if (!point.hit) throw new Error('covered')
    await page.touchscreen.tap(point.x, point.y)
  }
  const tap = (name: string | RegExp) => async () =>
    tapElement(await page.getByRole('button', { name, exact: true }).first().elementHandle({ timeout: 2000 }))
  const tapSelector = (selector: string) => async () => tapElement(await page.locator(selector).first().elementHandle({ timeout: 2000 }))
  const keys = async (name: string, text: string) => {
    for (const key of text) await step(`${name} "${key}"`, () => page.keyboard.press(key))
  }
  // the page's own buttons (tabs, paginator, accordion, like, share, widgets),
  // counted before the site-wide controls change anything
  const ownButtons = page.locator('main button:visible:enabled')
  const own = Math.min(await ownButtons.count(), pageButtons)
  await step('open menu', tap('Menu'))
  await step('close menu', tap('Menu'))
  await step('theme toggle', tap(/mode$/))
  await step('open search', tap(/^Search/))
  await step('focus search', tapSelector('[role=dialog] input'))
  await keys('search', 'cache')
  await step('close search', () => page.keyboard.press('Escape'))
  await step('accept cookies', tap('OK'))
  await step('focus newsletter', tapSelector('footer input[type=email]'))
  await keys('newsletter', 'abc')
  await step('subscribe', tap('Subscribe'))
  // A button that can't be scrolled into reach is skipped: on a phone the
  // blog paginator is wider than the screen and its first buttons are off it.
  for (let i = 0; i < own; i++)
    await step(`page button ${i + 1}`, async () =>
      tapElement(await ownButtons.nth(i).elementHandle({ timeout: 2000 })).catch(e => {
        if ((e as Error).message !== 'covered') throw e
      }),
    )
  await page.waitForTimeout(200)
  const events = await readEvents(page)
  if ((await page.locator('[role=dialog]').count()) > 0) failed.push('search dialog still open')
  if (failed.length) console.warn(`  ! ${path}: interaction failed: ${failed.join(', ')}`)
  const interactions = interactionsOf(events)
  // with fewer than 50 interactions, INP is the slowest one
  const worst = interactions[0]
  const slowest = worst ? (steps.findLast(s => s.at <= worst.start)?.name ?? 'during load') : 'none'
  await context.close()
  return {
    ...result,
    inp: worst?.duration ?? 0,
    interactions: interactions.length,
    slowest,
    ...(await measureLoadTaps(browser, origin, path)),
  }
}

/** linear-interpolated quantile, q in [0, 1] */
const quantile = (xs: number[], q: number) => {
  const sorted = [...xs].sort((a, b) => a - b)
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo)
}
const median = (xs: number[]) => quantile(xs, 0.5)

const mostCommon = (xs: string[]) => {
  const counts = new Map<string, number>()
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'none'
}

const summarizePhone = (runs: PhoneRun[]) => {
  const of = (f: (r: PhoneRun) => number) => runs.map(f)
  return {
    lcp: median(of(r => r.lcp)),
    lcpP25: quantile(of(r => r.lcp), 0.25),
    lcpP75: quantile(of(r => r.lcp), 0.75),
    fcp: median(of(r => r.fcp)),
    load: median(of(r => r.load)),
    inp: median(of(r => r.inp)),
    inpP25: quantile(of(r => r.inp), 0.25),
    inpP75: quantile(of(r => r.inp), 0.75),
    interactions: median(of(r => r.interactions)),
    inpLoad: median(of(r => r.inpLoad)),
    inpLoadP25: quantile(of(r => r.inpLoad), 0.25),
    inpLoadP75: quantile(of(r => r.inpLoad), 0.75),
    loadTaps: median(of(r => r.loadTaps)),
    slowest: mostCommon(runs.map(r => r.slowest)),
    runs,
  }
}

const summarize = (path: string, all: RequestRecord[][]): PageResult => {
  const avg = (f: (rs: RequestRecord[]) => number) => all.reduce((n, rs) => n + f(rs), 0) / all.length
  const count = (kind: Kind, phase: Phase) => avg(rs => rs.filter(r => r.kind === kind && r.phase === phase).length)
  const bytes = (kind: Kind, key: 'gzipBytes' | 'rawBytes', phase: Phase = 'page') =>
    avg(rs => rs.filter(r => r.kind === kind && r.phase === phase).reduce((n, r) => n + r[key], 0))
  const kinds = (phase: Phase) =>
    Object.fromEntries((['js', 'css', 'document', 'data', 'other'] as const).map(k => [k, count(k, phase)])) as Record<Kind, number>
  const requests = kinds('page')
  return {
    path,
    requests,
    prefetch: kinds('prefetch'),
    totalRequests: Object.values(requests).reduce((a, b) => a + b, 0),
    jsGzip: bytes('js', 'gzipBytes'),
    jsRaw: bytes('js', 'rawBytes'),
    jsGzipPrefetch: bytes('js', 'gzipBytes', 'prefetch'),
    cssGzip: bytes('css', 'gzipBytes'),
    htmlGzip: bytes('document', 'gzipBytes'),
    sample: all[0]!.map(r => ({ ...r, url: r.url.replace(/^https?:\/\/[^/]+/, '') })),
  }
}

const versionOf = (t: Target) => {
  if (t.version) return t.version
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

/** One failed page load shouldn't end a long run: report it and load again. */
async function attempt<A>(what: string, load: () => Promise<A>): Promise<A> {
  for (let tries = 1; ; tries++) {
    try {
      return await load()
    } catch (e) {
      console.warn(`  ! ${what}: attempt ${tries} failed: ${String((e as Error).message).split('\n')[0]}`)
      if (tries === 3) throw e
      // a context the failed load left open would keep its throttling
      for (const context of browser.contexts()) await context.close().catch(() => {})
    }
  }
}

const browser = await chromium.launch({ args: ['--ignore-certificate-errors'] })
const browserVersion = browser.version()
type Running = { t: Target; version: string; origin: string; stop: () => Promise<void> }
const running: Running[] = []
const requestRuns = new Map<string, RequestRecord[][]>()
const phoneRunsOf = new Map<string, PhoneRun[]>()
const key = (t: Target, path: string) => `${t.id} ${path}`
const results = []
try {
  // every server runs for the whole benchmark, so the phone rounds can
  // alternate between them
  for (const t of selected) {
    const server = await startServer(t)
    const proxy = await startProxy(t.port, t.port + 1000)
    running.push({
      t,
      version: versionOf(t),
      origin: proxy.origin,
      stop: async () => {
        await proxy.close()
        stopServer(server)
      },
    })
    // warm the server once so lazy server compilation doesn't skew anything
    for (const path of benchmarkPaths) await fetch(`http://localhost:${t.port}${path}`)
  }

  for (const { t, version, origin } of running) {
    console.log(`\n▶ ${t.label} ${version}: requests`)
    for (const path of benchmarkPaths) {
      const all: RequestRecord[][] = []
      for (let i = 0; i < runs; i++) all.push(await attempt(`${t.id} ${path}`, () => measurePage(browser, origin, path)))
      const failed = all[0]!.filter(r => r.status >= 400)
      if (failed.length) console.warn(`  ! ${path}: ${failed.map(r => `${r.status} ${r.url}`).join(', ')}`)
      requestRuns.set(key(t, path), all)
    }
  }

  console.log(`\n▶ phone: ${phoneRuns} rounds of ${running.length * benchmarkPaths.length} page loads`)
  for (let round = 1; round <= phoneRuns; round++) {
    const started = Date.now()
    for (const { t, origin } of running)
      for (const path of benchmarkPaths) {
        const k = key(t, path)
        phoneRunsOf.set(k, [...(phoneRunsOf.get(k) ?? []), await attempt(k, () => measurePhone(browser, origin, path))])
      }
    console.log(`  round ${round}/${phoneRuns} (${Math.round((Date.now() - started) / 1000)} s)`)
  }

  for (const { t, version } of running) {
    console.log(`\n▶ ${t.label} ${version}`)
    const pages = benchmarkPaths.map(path => ({
      ...summarize(path, requestRuns.get(key(t, path))!),
      phone: summarizePhone(phoneRunsOf.get(key(t, path)) ?? []),
    }))
    for (const p of pages)
      console.log(
        `  ${p.path.padEnd(38)} js ${p.requests.js.toFixed(1).padStart(4)} (+${p.prefetch.js.toFixed(1)})  css ${p.requests.css.toFixed(1).padStart(4)}  data ${(p.requests.data + p.prefetch.data).toFixed(1).padStart(4)}  js-gz ${(p.jsGzip / 1024).toFixed(1).padStart(6)} KiB (+${(p.jsGzipPrefetch / 1024).toFixed(1)})  LCP ${Math.round(p.phone.lcp).toString().padStart(5)} ms  INP ${Math.round(p.phone.inp).toString().padStart(4)} ms (${p.phone.slowest}, ${p.phone.interactions} interactions)  INP during load ${Math.round(p.phone.inpLoad).toString().padStart(4)} ms (${p.phone.loadTaps} taps)`,
      )
    const mean = (f: (p: (typeof pages)[number]) => number) => pages.reduce((n, p) => n + f(p), 0) / pages.length
    results.push({
      id: t.id,
      label: t.label,
      version,
      average: {
        jsRequests: mean(p => p.requests.js),
        cssRequests: mean(p => p.requests.css),
        jsRequestsPrefetch: mean(p => p.prefetch.js),
        cssRequestsPrefetch: mean(p => p.prefetch.css),
        dataRequests: mean(p => p.requests.data + p.prefetch.data),
        totalRequests: mean(p => p.totalRequests),
        jsGzipKiB: mean(p => p.jsGzip) / 1024,
        jsRawKiB: mean(p => p.jsRaw) / 1024,
        jsGzipPrefetchKiB: mean(p => p.jsGzipPrefetch) / 1024,
        cssGzipKiB: mean(p => p.cssGzip) / 1024,
        htmlGzipKiB: mean(p => p.htmlGzip) / 1024,
        phoneLcpMs: mean(p => p.phone.lcp),
        /** run-to-run spread: the interquartile range per page, averaged */
        phoneLcpIqrMs: mean(p => p.phone.lcpP75 - p.phone.lcpP25),
        phoneFcpMs: mean(p => p.phone.fcp),
        phoneLoadMs: mean(p => p.phone.load),
        phoneInpMs: mean(p => p.phone.inp),
        phoneInpIqrMs: mean(p => p.phone.inpP75 - p.phone.inpP25),
        /** the slowest page's INP */
        phoneInpWorstPageMs: Math.max(...pages.map(p => p.phone.inp)),
        interactionsPerPage: mean(p => p.phone.interactions),
        phoneInpLoadMs: mean(p => p.phone.inpLoad),
        phoneInpLoadIqrMs: mean(p => p.phone.inpLoadP75 - p.phone.inpLoadP25),
        phoneInpLoadWorstPageMs: Math.max(...pages.map(p => p.phone.inpLoad)),
      },
      pages,
    })
  }
} finally {
  for (const r of running) await r.stop()
  await browser.close()
}

const out = {
  date: new Date().toISOString(),
  runsPerPage: runs,
  phoneRunsPerPage: phoneRuns,
  phoneProfile,
  phonePageLoads: 2 * phoneRuns * benchmarkPaths.length * results.length,
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
        'JS prefetch': +r.average.jsRequestsPrefetch.toFixed(1),
        'data reqs': +r.average.dataRequests.toFixed(1),
        'JS gzip KiB': Math.round(r.average.jsGzipKiB),
        'CSS gzip KiB': +r.average.cssGzipKiB.toFixed(1),
        'LCP ms': Math.round(r.average.phoneLcpMs),
        'LCP IQR': Math.round(r.average.phoneLcpIqrMs),
        'INP ms': Math.round(r.average.phoneInpMs),
        'INP IQR': Math.round(r.average.phoneInpIqrMs),
        'INP worst page': Math.round(r.average.phoneInpWorstPageMs),
        interactions: +r.average.interactionsPerPage.toFixed(1),
        'INP load ms': Math.round(r.average.phoneInpLoadMs),
        'INP load IQR': Math.round(r.average.phoneInpLoadIqrMs),
      },
    ]),
  ),
)
console.log('wrote bench/results/latest.json')
