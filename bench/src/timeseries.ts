// Renders bench/results/history.json as a small-multiples line chart, in the
// same card as bench/src/chart.ts. One point per run is a dot, not a line.
//
//   node bench/src/timeseries.ts

import { writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { frameworkOrder, historyPath, loadHistory, root, type History, type HistoryRun } from './history.ts'

const resultsDir = join(root, 'bench/results')

export const frameworkColor: Record<string, string> = {
  next: '#2563eb',
  vinext: '#6d28d9',
  'tanstack-start': '#0f766e',
  'react-router': '#c2410c',
  astro: '#be185d',
  'effect-ui': '#0e7490',
  xote: '#3f6212',
  foldkit: '#4b5563',
}
const fallbackColors = ['#1d4ed8', '#7c3aed', '#047857', '#b45309', '#9d174d', '#155e75', '#365314', '#374151']

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type Metric = {
  id: string
  title: string
  value: (metrics: Record<string, number>) => number | undefined
  format: (n: number) => string
}

/** Same rounding the bar chart uses for a request count. */
function fmtRequests(n: number): string {
  return Number.isInteger(Math.round(n * 10) / 10) ? String(Math.round(n)) : n.toFixed(1)
}

const metrics: Metric[] = [
  {
    id: 'requests',
    title: 'Requests per page',
    value: m => (m.jsRequests === undefined || m.cssRequests === undefined ? undefined : m.jsRequests + m.cssRequests),
    format: fmtRequests,
  },
  {
    id: 'js',
    title: 'JS per page (gzip)',
    value: m => m.jsGzipKiB,
    format: n => `${Math.round(n)} KiB`,
  },
  {
    id: 'lcp',
    title: 'LCP on 4G phone',
    value: m => m.phoneLcpMs,
    format: n => `${Math.round(n)} ms`,
  },
  {
    id: 'inp',
    title: 'INP while loading',
    value: m => m.phoneInpLoadMs,
    format: n => `${Math.round(n)} ms`,
  },
]

/** Nice axis top so the largest point sits a little below the frame. */
export function niceScale(maxValue: number): { max: number; step: number } {
  if (!(maxValue > 0)) return { max: 1, step: 1 }
  const rough = maxValue * 1.12
  const raw = rough / 4
  const pow = 10 ** Math.floor(Math.log10(raw))
  const err = raw / pow
  const nice = err <= 1 ? 1 : err <= 2 ? 2 : err <= 3 ? 2.5 : err <= 6 ? 5 : 10
  const step = nice * pow
  return { max: Math.ceil((rough - 1e-9) / step) * step, step }
}

const esc = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function textWidth(text: string, size: number): number {
  let width = 0
  for (const char of text) {
    if (char === ' ') width += size * 0.33
    else if ('.,:;·'.includes(char)) width += size * 0.28
    else if (char >= '0' && char <= '9') width += size * 0.58
    else if (char.toLowerCase() !== char && char.toUpperCase() === char) width += size * 0.7
    else width += size * 0.54
  }
  return width
}

function wrap(text: string, maxWidth: number, size: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (line && textWidth(next, size) > maxWidth) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

function shortDate(date: string, withYear: boolean): string {
  const [year, month, day] = date.split('-')
  const label = `${months[Number(month) - 1]} ${Number(day)}`
  return withYear ? `${label} ${year}` : label
}

function timeOf(recordedAt: string): string {
  return recordedAt.split('T')[1]?.slice(0, 5) ?? ''
}

type Series = { id: string; label: string; color: string; dashed: boolean; version: string }

function seriesList(history: History, plotted: HistoryRun[]): Series[] {
  const present = new Set(plotted.flatMap(run => run.frameworks.map(framework => framework.id)))
  const ids = [
    ...frameworkOrder.filter(id => present.has(id)),
    ...[...present].filter(id => !frameworkOrder.includes(id)),
  ]
  const last = plotted.at(-1)
  return ids.map((id, index) => {
    let label = id
    let version = ''
    for (let i = plotted.length - 1; i >= 0; i--) {
      const framework = plotted[i]!.frameworks.find(item => item.id === id)
      if (!framework) continue
      label = framework.label
      version = framework.version
      break
    }
    return {
      id,
      label,
      version,
      color: frameworkColor[id] ?? fallbackColors[index % fallbackColors.length]!,
      dashed: last ? !last.frameworks.some(framework => framework.id === id) : false,
    }
  })
}

export function chartFoot(history: History): string {
  const plotted = history.runs.filter(run => run.plot)
  const hidden = history.runs.filter(run => !run.plot)
  const profile = plotted.find(run => run.phoneProfile)?.phoneProfile
  const loads = new Map<number, string[]>()
  for (const run of plotted) {
    const dates = loads.get(run.phoneRunsPerPage) ?? []
    if (!dates.includes(run.date)) dates.push(run.date)
    loads.set(run.phoneRunsPerPage, dates)
  }
  const loadText = [...loads.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([count, dates]) => `${count} loads per page on ${dates.join(', ')}`)
    .join('; ')
  const inpDates = [
    ...new Set(
      plotted
        .filter(run => run.frameworks.some(framework => typeof framework.metrics.phoneInpLoadMs === 'number'))
        .map(run => run.date),
    ),
  ]
  const phone = profile ? `${profile.latencyMs} ms RTT, ${profile.mbps} Mbit/s, ${profile.cpuSlowdown}× CPU` : 'the throttled phone'
  const inp = inpDates.length === 1 ? ` INP while loading starts on ${inpDates[0]}.` : ''
  const skipped = hidden.length ? ` Not plotted: ${hidden.map(run => run.date).join(', ')}.` : ''
  return `Same pages, production builds, HTTP/2 + gzip, cold cache, prefetching excluded. Requests are JS plus CSS. Ticks are runs, equally spaced. Phone medians (${phone}): ${loadText}.${inp} The legend names the latest plotted version.${skipped}`
}

function spread(ys: number[], min: number, max: number, gap: number): number[] {
  const items = ys.map((y, index) => ({ y, index })).sort((a, b) => a.y - b.y)
  for (let i = 1; i < items.length; i++) items[i]!.y = Math.max(items[i]!.y, items[i - 1]!.y + gap)
  if (items.length && items[items.length - 1]!.y > max) {
    items[items.length - 1]!.y = max
    for (let i = items.length - 2; i >= 0; i--) items[i]!.y = Math.min(items[i]!.y, items[i + 1]!.y - gap)
  }
  if (items.length && items[0]!.y < min) {
    items[0]!.y = min
    for (let i = 1; i < items.length; i++) items[i]!.y = Math.max(items[i]!.y, items[i - 1]!.y + gap)
  }
  const out = new Array<number>(ys.length)
  for (const item of items) out[item.index] = item.y
  return out
}

type Box = { x: number; y: number; w: number; h: number }

function renderPanel(
  metric: Metric,
  runs: HistoryRun[],
  series: Series[],
  box: Box,
  withYear: boolean,
): string {
  const yAxis = 36
  const gutter = 78
  const titleH = 22
  const labelH = runs.length > 8 ? 56 : 34
  const plotLeft = box.x + yAxis
  const plotTop = box.y + titleH
  const plotW = box.w - yAxis - gutter
  const plotH = box.h - titleH - labelH
  const values = runs.flatMap(run =>
    series.flatMap(item => {
      const framework = run.frameworks.find(framework => framework.id === item.id)
      const value = framework ? metric.value(framework.metrics) : undefined
      return value === undefined ? [] : [value]
    }),
  )
  const scale = niceScale(Math.max(...values, 0))
  const yOf = (value: number) => plotTop + plotH - (value / scale.max) * plotH
  const xOf = (index: number) => {
    if (runs.length <= 1) return plotLeft + plotW / 2
    const inset = Math.min(16, plotW / 8)
    return plotLeft + inset + ((plotW - inset * 2) * index) / (runs.length - 1)
  }
  const ticks: number[] = []
  for (let tick = 0; tick <= scale.max + scale.step * 0.01; tick += scale.step) ticks.push(Number(tick.toFixed(6)))

  const parts: string[] = []
  parts.push(
    `<text x="${box.x}" y="${box.y + 14}" fill="#111827" font-size="14" font-weight="600">${esc(metric.title)}</text>`,
  )
  for (const tick of ticks) {
    const y = yOf(tick)
    parts.push(`<line x1="${plotLeft}" y1="${y}" x2="${plotLeft + plotW}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>`)
    const label = Number.isInteger(tick) ? String(tick) : tick.toFixed(1)
    parts.push(
      `<text x="${plotLeft - 8}" y="${y}" text-anchor="end" dominant-baseline="middle" fill="#6b7280" font-size="11">${label}</text>`,
    )
  }

  const rotate = runs.length > 8
  runs.forEach((run, index) => {
    const x = xOf(index)
    const date = shortDate(run.date, withYear)
    const time = timeOf(run.recordedAt)
    if (rotate) {
      parts.push(
        `<text x="${x}" y="${plotTop + plotH + 14}" fill="#6b7280" font-size="11" text-anchor="end" transform="rotate(-40 ${x} ${plotTop + plotH + 14})">${esc(`${date} ${time}`)}</text>`,
      )
    } else {
      parts.push(
        `<text x="${x}" y="${plotTop + plotH + 16}" text-anchor="middle" fill="#6b7280" font-size="11">${esc(date)}</text>`,
      )
      parts.push(
        `<text x="${x}" y="${plotTop + plotH + 30}" text-anchor="middle" fill="#6b7280" font-size="11">${esc(time)}</text>`,
      )
    }
  })

  const lines: string[] = []
  const dots: string[] = []
  for (const item of series) {
    let segment: { x: number; y: number }[] = []
    const flush = () => {
      if (segment.length >= 2) {
        const dash = item.dashed ? ' stroke-dasharray="5 4"' : ''
        lines.push(
          `<polyline data-id="${esc(item.id)}" data-metric="${metric.id}" fill="none" stroke="${item.color}" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round"${dash} points="${segment.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')}"/>`,
        )
      }
      segment = []
    }
    const radius = runs.length === 1 ? 5.5 : 4.25
    runs.forEach((run, index) => {
      const framework = run.frameworks.find(framework => framework.id === item.id)
      const value = framework ? metric.value(framework.metrics) : undefined
      if (value === undefined) {
        flush()
        return
      }
      const point = { x: xOf(index), y: yOf(value) }
      segment.push(point)
      dots.push(
        `<circle data-id="${esc(item.id)}" data-metric="${metric.id}" data-value="${value}" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="${radius}" fill="${item.color}" stroke="#fafafa" stroke-width="2"/>`,
      )
    })
    flush()
  }
  parts.push(...lines, ...dots)

  // Value labels sit on the last run that has this metric, in the right gutter.
  const lastIndex = runs.length - 1
  const labels = series.flatMap(item => {
    const framework = runs[lastIndex]?.frameworks.find(framework => framework.id === item.id)
    const value = framework ? metric.value(framework.metrics) : undefined
    if (value === undefined) return []
    return [{ color: item.color, y: yOf(value), text: metric.format(value) }]
  })
  const placed = spread(
    labels.map(label => label.y),
    plotTop + 8,
    plotTop + plotH - 8,
    18,
  )
  labels.forEach((label, index) => {
    const y = placed[index]!
    parts.push(
      `<text x="${(plotLeft + plotW + 8).toFixed(1)}" y="${y.toFixed(1)}" dominant-baseline="middle" fill="${label.color}" font-size="12" font-weight="600">${esc(label.text)}</text>`,
    )
  })

  return parts.join('\n')
}

export function renderHistorySvg(history: History): { svg: string; width: number; height: number } {
  const plotted = history.runs.filter(run => run.plot)
  const width = 1300
  const padX = 24
  const padTop = 28
  if (!plotted.length) {
    const height = 160
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" font-family="Inter, ui-sans-serif, system-ui, -apple-system, sans-serif">
      <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="14" fill="#fafafa" stroke="#e5e7eb"/>
      <text x="${padX}" y="54" fill="#111827" font-size="19" font-weight="600">No comparable runs to plot</text>
      <text x="${padX}" y="84" fill="#6b7280" font-size="13">history.json has runs, and none of them are marked plot: true.</text>
    </svg>`
    return { svg, width, height }
  }

  const series = seriesList(history, plotted)
  const years = new Set(plotted.map(run => run.date.slice(0, 4)))
  const withYear = years.size > 1
  const pages = plotted.at(-1)!.paths.length
  const title = `The same ${pages} pages over time`

  const legendTop = padTop + 36
  const legendSize = 13
  const legendLine = 22
  let cursorX = padX
  let cursorY = legendTop
  const legend: { item: Series; x: number; y: number }[] = []
  for (const item of series) {
    const itemWidth = 28 + textWidth(`${item.label} ${item.version}`, legendSize) + 16
    if (cursorX + itemWidth > width - padX && cursorX > padX) {
      cursorX = padX
      cursorY += legendLine
    }
    legend.push({ item, x: cursorX, y: cursorY })
    cursorX += itemWidth
  }
  const legendHeight = cursorY - legendTop + legendLine

  const active = metrics
    .map(metric => ({
      metric,
      runs: plotted.filter(run => run.frameworks.some(framework => metric.value(framework.metrics) !== undefined)),
    }))
    .filter(panel => panel.runs.length > 0)
  const columns = 2
  const rows = Math.ceil(active.length / columns)
  const gap = 22
  const panelW = (width - padX * 2 - gap) / columns
  const panelH = (index: number) => (active[index]!.runs.length > 8 ? 292 : 268)
  const rowHeights: number[] = []
  for (let row = 0; row < rows; row++) {
    const left = panelH(row * columns)
    const right = active[row * columns + 1] ? panelH(row * columns + 1) : left
    rowHeights.push(Math.max(left, right))
  }
  const panelsTop = legendTop + legendHeight + 8
  const panelsHeight = rowHeights.reduce((sum, height) => sum + height, 0) + gap * Math.max(0, rows - 1)

  const footSize = 12.5
  const foot = chartFoot(history)
  const footLines = wrap(foot, width - padX * 2, footSize)
  const footTop = panelsTop + panelsHeight + 20
  const height = Math.ceil(footTop + footLines.length * 17 + 16)

  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" font-family="Inter, ui-sans-serif, system-ui, -apple-system, sans-serif">`,
  )
  parts.push(`<title>${esc(title)}</title>`)
  parts.push(`<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="14" fill="#fafafa" stroke="#e5e7eb"/>`)
  parts.push(`<text x="${padX}" y="${padTop + 16}" fill="#111827" font-size="19" font-weight="600">${esc(title)}</text>`)

  for (const { item, x, y } of legend) {
    const dash = item.dashed ? ' stroke-dasharray="4 3"' : ''
    parts.push(
      `<line x1="${x}" y1="${y + 4}" x2="${x + 18}" y2="${y + 4}" stroke="${item.color}" stroke-width="2.25" stroke-linecap="round"${dash}/>`,
    )
    parts.push(
      `<circle cx="${x + 9}" cy="${y + 4}" r="3.25" fill="${item.color}" stroke="#fafafa" stroke-width="1.5"/>`,
    )
    parts.push(
      `<text x="${x + 24}" y="${y + 8}" fill="#374151" font-size="${legendSize}">${esc(`${item.label} ${item.version}`)}</text>`,
    )
  }

  let rowTop = panelsTop
  active.forEach((panel, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    if (column === 0 && row > 0) rowTop += rowHeights[row - 1]! + gap
    const box = { x: padX + column * (panelW + gap), y: rowTop, w: panelW, h: rowHeights[row]! }
    parts.push(renderPanel(panel.metric, panel.runs, series, box, withYear))
  })

  footLines.forEach((line, index) => {
    parts.push(
      `<text x="${padX}" y="${footTop + 12 + index * 17}" fill="#6b7280" font-size="${footSize}">${esc(line)}</text>`,
    )
  })
  parts.push('</svg>')
  return { svg: parts.join('\n'), width, height }
}

export function renderHistoryHtml(svg: string, width: number, height: number): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>The same pages over time</title>
<style>
  body { margin:0; background:#f3f4f6; }
  #card { width:${width}px; height:${height}px; }
  svg { display:block; }
</style></head>
<body><div id="card">${svg}</div></body></html>`
}

const invoked = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (invoked) {
  const history = loadHistory()
  const { svg, width, height } = renderHistorySvg(history)
  writeFileSync(join(resultsDir, 'history.svg'), svg)
  const html = renderHistoryHtml(svg, width, height)
  writeFileSync(join(resultsDir, 'history.html'), html)
  const { chromium } = await import('playwright')
  const browser = await chromium.launch()
  const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: width + 40, height: height + 40 } })
  await page.setContent(html)
  await page.locator('#card').screenshot({ path: join(resultsDir, 'history.png'), omitBackground: true })
  await browser.close()
  console.log('wrote bench/results/history.svg, history.html and history.png')
}
