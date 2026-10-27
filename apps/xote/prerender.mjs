// Writes one HTML file per path: the server-rendered app, the page data the
// client hydrates from, and the client bundle from the Vite manifest.
// Xote is a UI library rather than a framework, so this static-site step is
// ours (Foldkit's Vite plugin does the equivalent for Foldkit).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const { render, paths } = await import('./dist/server/EntryServer.res.js')
const manifest = JSON.parse(readFileSync('dist/client/.vite/manifest.json', 'utf8'))
const entry = manifest['src/EntryClient.res.mjs']

const head = [
  ...(entry.css ?? []).map(file => `<link rel="stylesheet" href="/${file}">`),
  `<script type="module" src="/${entry.file}"></script>`,
].join('')

// JSON inside <script> must not be able to close the tag.
const safeJson = json => json.replace(/</g, '\\u003c')
const escapeHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

for (const path of paths()) {
  const { html, title, data } = render(path)
  const file = join('dist/client', path, 'index.html')
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(
    file,
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="Essays on building for the web, one request at a time.">${head}</head><body><div id="root">${html}</div><script type="application/json" id="page-data">${safeJson(data)}</script></body></html>`,
  )
}
console.log(`prerendered ${paths().length} pages`)
