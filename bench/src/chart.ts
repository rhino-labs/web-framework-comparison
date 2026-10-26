// Renders bench/results/latest.json as a chart card (HTML + 2x PNG).
//
//   node bench/src/chart.ts [--highlight foldkit] [--title "..."] [--subtitle "..."]

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { chromium } from 'playwright'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const resultsDir = join(root, 'bench/results')

type Result = {
  id: string
  label: string
  version: string
  average: { jsRequests: number; cssRequests: number; jsGzipKiB: number; phoneLcpMs?: number }
}
const data = JSON.parse(readFileSync(join(resultsDir, 'latest.json'), 'utf8')) as {
  results: Result[]
  phoneProfile?: { latencyMs: number; mbps: number; cpuSlowdown: number }
}
const results = data.results

const { values: args } = parseArgs({
  options: {
    highlight: { type: 'string' },
    title: { type: 'string' },
    subtitle: { type: 'string' },
  },
})

const phone = data.phoneProfile
const hasLcp = results.every(r => r.average.phoneLcpMs !== undefined)
const subtitle =
  args.subtitle ??
  `Content site prototype, production build, cold cache, averaged over pages` +
    (phone && hasLcp ? ` · LCP: ${phone.latencyMs} ms RTT, ${phone.mbps} Mbit/s, ${phone.cpuSlowdown}× CPU throttle` : '')

const reqs = (r: Result) => r.average.jsRequests + r.average.cssRequests
const byJs = [...results].sort((a, b) => a.average.jsGzipKiB - b.average.jsGzipKiB)
const highlight = results.find(r => r.id === args.highlight) ?? byJs[0]!
const heaviest = byJs.at(-1)!

const pct = (a: number, b: number) => Math.round((1 - a / b) * 100)
const title =
  args.title ??
  `${highlight.label}: ${pct(highlight.average.jsGzipKiB, heaviest.average.jsGzipKiB)}% less JS than ${heaviest.label}, ${reqs(highlight) < Math.min(...results.filter(r => r !== highlight).map(reqs)) ? 'fewest' : `${fmt(reqs(highlight))}`} requests per page`

function fmt(n: number) {
  return Number.isInteger(Math.round(n * 10) / 10) ? String(Math.round(n)) : n.toFixed(1)
}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

const maxReqs = Math.max(...results.map(reqs))
const maxJs = Math.max(...results.map(r => r.average.jsGzipKiB))
const maxLcp = Math.max(...results.map(r => r.average.phoneLcpMs ?? 0))

const rows = results
  .map(r => {
    const hi = r === highlight
    const js = r.average.jsRequests
    const css = r.average.cssRequests
    const total = js + css
    // bars fill at most ~75% of the panel so the value label fits after them
    const reqW = (total / maxReqs) * 75
    const kibW = (r.average.jsGzipKiB / maxJs) * 75
    const seg = (n: number, cls: string) =>
      `<div class="seg ${cls}" style="flex:${n}">${(n / maxReqs) * 75 > 5 ? `<span>${fmt(n)}</span>` : ''}</div>`
    return `
      <div class="label ${hi ? 'hi' : ''}">${esc(r.label)} ${esc(r.version)}</div>
      <div class="track">
        <div class="bar ${hi ? 'hi' : ''}" style="width:${reqW}%">${seg(js, 'js')}${seg(css, 'css')}</div>
        <div class="value ${hi ? 'hi' : ''}">${fmt(total)}</div>
      </div>
      <div class="track">
        <div class="bar ${hi ? 'hi' : ''}" style="width:${kibW}%"><div class="seg js" style="flex:1"></div></div>
        <div class="value ${hi ? 'hi' : ''}">${Math.round(r.average.jsGzipKiB)} KiB</div>
      </div>${
        hasLcp
          ? `
      <div class="track">
        <div class="bar ${hi ? 'hi' : ''}" style="width:${(r.average.phoneLcpMs! / maxLcp) * 70}%"><div class="seg js" style="flex:1"></div></div>
        <div class="value ${hi ? 'hi' : ''}">${Math.round(r.average.phoneLcpMs!)} ms</div>
      </div>`
          : ''
      }`
  })
  .join('')

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  :root { --hi-js:#2563eb; --hi-css:#93c5fd; --lo-js:#9ca3af; --lo-css:#d1d5db; --text:#111827; --muted:#6b7280; }
  body { margin:0; background:#f3f4f6; font:15px/1.4 Inter, ui-sans-serif, system-ui, -apple-system, sans-serif; color:var(--text); }
  .card { width:${hasLcp ? 1040 : 760}px; box-sizing:border-box; margin:0; padding:28px 24px 24px; background:#fafafa; border:1px solid #e5e7eb; border-radius:14px; }
  h1 { font-size:19px; font-weight:600; margin:0 0 26px; letter-spacing:-0.01em; }
  .grid { display:grid; grid-template-columns:auto ${hasLcp ? '1fr 1fr 1fr' : '1fr 1fr'}; column-gap:24px; row-gap:12px; align-items:center; }
  .head { font-weight:500; font-size:14px; display:flex; justify-content:space-between; align-items:center; gap:16px; padding-right:12px; }
  .legend { display:flex; gap:12px; color:var(--muted); font-weight:400; }
  .legend i { display:inline-block; width:10px; height:10px; border-radius:50%; margin-right:5px; vertical-align:-1px; }
  .label { color:var(--muted); white-space:nowrap; font-size:14px; }
  .label.hi { color:var(--text); font-weight:600; }
  .track { display:flex; align-items:center; gap:14px; }
  .bar { flex:none; display:flex; height:28px; }
  .seg { height:100%; display:flex; align-items:center; justify-content:flex-end; box-sizing:border-box; padding-right:6px; font-size:12px; overflow:hidden; }
  .seg:first-child { border-radius:5px 0 0 5px; }
  .seg:last-child { border-radius:0 5px 5px 0; }
  .seg:only-child { border-radius:5px; }
  .seg.js { background:var(--lo-js); color:#fff; }
  .seg.css { background:var(--lo-css); color:#374151; }
  .bar.hi .seg.js { background:var(--hi-js); }
  .bar.hi .seg.css { background:var(--hi-css); color:#1e3a8a; }
  .value { color:var(--muted); font-size:14px; white-space:nowrap; min-width:56px; }
  .value.hi { color:var(--text); font-weight:600; }
  .foot { margin-top:22px; color:var(--muted); font-size:12.5px; }
</style></head>
<body><div class="card" id="card">
  <h1>${esc(title)}</h1>
  <div class="grid">
    <div></div>
    <div class="head">Requests per page <span class="legend"><span><i style="background:var(--hi-js)"></i>JS</span><span><i style="background:var(--hi-css)"></i>CSS</span></span></div>
    <div class="head">JS per page (gzip)</div>
    ${hasLcp ? '<div class="head">LCP on 4G phone</div>' : ''}
    ${rows}
  </div>
  <div class="foot">${esc(subtitle)}</div>
</div></body></html>`

writeFileSync(join(resultsDir, 'chart.html'), html)

const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1100, height: 600 } })
await page.setContent(html)
await page.locator('#card').screenshot({ path: join(resultsDir, 'chart.png'), omitBackground: true })
await browser.close()
console.log('wrote bench/results/chart.html and bench/results/chart.png')
