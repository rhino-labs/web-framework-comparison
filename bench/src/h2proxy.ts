// A minimal HTTPS + HTTP/2 reverse proxy in front of each framework's
// production server.
//
// The framework servers (next start, vite preview, react-router-serve, …)
// speak plain HTTP/1.1, where Chromium opens at most 6 connections per
// origin, so a page with many parallel requests queues behind itself. Real
// deployments sit behind a CDN speaking HTTP/2 or HTTP/3. Putting every
// framework behind the same HTTP/2 proxy measures that case and treats all
// servers alike. Bodies are streamed through untouched.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import http from 'node:http'
import http2 from 'node:http2'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Hop-by-hop headers, which HTTP/2 forbids.
const HOP_BY_HOP = new Set(['connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'proxy-connection', 'http2-settings', 'te'])

/** A throwaway self-signed certificate for localhost. */
const makeCertificate = () => {
  const dir = mkdtempSync(join(tmpdir(), 'wfc-cert-'))
  try {
    execFileSync('openssl', [
      'req', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:prime256v1', '-nodes',
      '-keyout', join(dir, 'key.pem'), '-out', join(dir, 'cert.pem'), '-days', '1',
      '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost',
    ], { stdio: 'ignore' })
    return { key: readFileSync(join(dir, 'key.pem')), cert: readFileSync(join(dir, 'cert.pem')) }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

let certificate: { key: Buffer; cert: Buffer } | undefined

export type Proxy = { origin: string; close: () => Promise<void> }

export async function startProxy(upstreamPort: number, port: number): Promise<Proxy> {
  certificate ??= makeCertificate()
  const agent = new http.Agent({ keepAlive: true, maxSockets: 64 })
  const upstreamOrigin = `http://localhost:${upstreamPort}`
  const origin = `https://localhost:${port}`

  const server = http2.createSecureServer({ ...certificate, allowHTTP1: true }, (req, res) => {
    const headers: http.OutgoingHttpHeaders = {}
    for (const [name, value] of Object.entries(req.headers)) {
      if (!name.startsWith(':') && !HOP_BY_HOP.has(name)) headers[name] = value
    }
    headers.host = `localhost:${upstreamPort}`
    const upstream = http.request(
      { host: 'localhost', port: upstreamPort, method: req.method, path: req.url, headers, agent },
      response => {
        const out: http.OutgoingHttpHeaders = {}
        for (const [name, value] of Object.entries(response.headers)) {
          if (HOP_BY_HOP.has(name) || value === undefined) continue
          out[name] = name === 'location' && typeof value === 'string' ? value.replace(upstreamOrigin, origin) : value
        }
        res.writeHead(response.statusCode ?? 502, out)
        response.pipe(res)
      },
    )
    upstream.on('error', () => {
      if (!res.headersSent) res.writeHead(502)
      res.end()
    })
    req.pipe(upstream)
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, 'localhost', resolve)
  })
  return {
    origin,
    close: () =>
      new Promise(resolve => {
        agent.destroy()
        server.close(() => resolve())
        // drop idle HTTP/2 sessions so close() doesn't wait on them
        setTimeout(resolve, 1000).unref()
      }),
  }
}
