// Writes the static site: one HTML file per path, rendered by
// `HtmlServer.renderToHtml` with the state the client hydrates from, and the
// JSON files the app fetches on client-side navigation.
// Effect UI has no static-site command yet, so this step is ours (as it is
// for Xote): it only places the framework's output in a document and adds
// the tags for the files Vite built.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const { dataFiles, moduleOf, paths, render } = await import('./dist/server/prerender.js')
const manifest = JSON.parse(readFileSync('dist/client/.vite/manifest.json', 'utf8'))

const write = (path, contents) => {
  const file = join('dist/client', path)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, contents)
}

/** A chunk and everything it imports statically: the JS files and their CSS. */
const filesOf = (key, seen = new Set()) => {
  if (seen.has(key)) return { js: [], css: [] }
  seen.add(key)
  const chunk = manifest[key]
  const imported = (chunk.imports ?? []).map(name => filesOf(name, seen))
  return {
    js: [chunk.file, ...imported.flatMap(files => files.js)],
    css: [...(chunk.css ?? []), ...imported.flatMap(files => files.css)],
  }
}

const entry = filesOf('src/main.ts')
const [entryFile, ...entryImports] = entry.js

for (const path of paths) {
  const page = await render(path)
  // `model` is undefined when the root failed to render.
  if (page.model === undefined) throw new Error(`could not render ${path}`)
  // A generated page is a lazy chunk: link its files, so the browser fetches
  // them with the entry rather than after it has run.
  const lazy = moduleOf(path) ? filesOf(moduleOf(path)) : { js: [], css: [] }
  const css = [...new Set([...entry.css, ...lazy.css])]
  const preloads = [...new Set([...entryImports, ...lazy.js])].filter(file => file !== entryFile)
  const tags = [
    ...css.map(file => `<link rel="stylesheet" href="/${file}">`),
    ...preloads.map(file => `<link rel="modulepreload" href="/${file}">`),
    `<script type="module" src="/${entryFile}"></script>`,
  ].join('')
  write(
    join(path, 'index.html'),
    `<!doctype html><html ${page.htmlAttributes}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${page.head}${tags}</head><body ${page.bodyAttributes}><div id="root">${page.html}</div><script type="application/json" id="state">${page.state}</script></body></html>`,
  )
}

const data = dataFiles()
for (const [path, body] of data) write(path, JSON.stringify(body))

console.log(`prerendered ${paths.length} pages and ${data.size} data files`)
