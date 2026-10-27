// Serves a prerendered site the way a static host does: /about resolves to
// about/index.html (or about.html), anything else is a 404. Used for the
// frameworks whose production output is plain files (Foldkit, Xote).
//
// `vite preview` isn't used for these: with its default SPA fallback,
// /about (no trailing slash) serves the root index.html instead.
//
//   node bench/src/static-server.ts <dir> <port>

import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'

const [dir = '.', port = '4100'] = process.argv.slice(2)
const root = resolve(dir)

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

const isFile = (path: string) => {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

const resolveFile = (pathname: string): string | undefined => {
  const base = join(root, normalize(decodeURIComponent(pathname)))
  if (!base.startsWith(root)) return undefined
  return [base, join(base, 'index.html'), `${base}.html`].find(isFile)
}

createServer((req, res) => {
  const file = resolveFile(new URL(req.url ?? '/', 'http://localhost').pathname)
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found')
    return
  }
  res.writeHead(200, {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    // hashed assets are immutable; HTML is revalidated
    'cache-control': file.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
  })
  createReadStream(file).pipe(res)
}).listen(Number(port), 'localhost')
