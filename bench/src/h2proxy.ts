// A minimal HTTPS + HTTP/2 reverse proxy in front of each framework's
// production server.
//
// The framework servers (next start, vite preview, react-router-serve, …)
// speak plain HTTP/1.1, where Chromium opens at most 6 connections per
// origin, so a page with many parallel requests queues behind itself. Real
// deployments sit behind a CDN speaking HTTP/2 or HTTP/3. Putting every
// framework behind the same HTTP/2 proxy measures that case and treats all
// servers alike.
//
// Compression is normalized the same way: the proxy asks every server for
// uncompressed responses and gzips all text itself (level 6, flushed per
// chunk so streamed HTML still streams). Left alone, some servers send
// brotli, some gzip and some nothing, which on a throttled phone connection
// measures the server's defaults rather than the framework.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import http from 'node:http'
import http2 from 'node:http2'
import zlib from 'node:zlib'
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

const COMPRESSIBLE = /^(text\/|application\/(javascript|json|xml|x-component)|image\/svg)/

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
    headers['accept-encoding'] = 'identity'
    const acceptsGzip = /\bgzip\b/.test(String(req.headers['accept-encoding'] ?? ''))
    const upstream = http.request(
      { host: 'localhost', port: upstreamPort, method: req.method, path: req.url, headers, agent },
      response => {
        const out: http.OutgoingHttpHeaders = {}
        for (const [name, value] of Object.entries(response.headers)) {
          if (HOP_BY_HOP.has(name) || value === undefined) continue
          out[name] = name === 'location' && typeof value === 'string' ? value.replace(upstreamOrigin, origin) : value
        }
        const compress =
          acceptsGzip &&
          [undefined, 'identity'].includes(response.headers['content-encoding']) &&
          COMPRESSIBLE.test(String(response.headers['content-type'] ?? '')) &&
          req.method !== 'HEAD'
        if (!compress) {
          res.writeHead(response.statusCode ?? 502, out)
          response.pipe(res)
          return
        }
        delete out['content-length']
        delete out['content-encoding']
        out['content-encoding'] = 'gzip'
        out.vary = out.vary ? `${out.vary}, Accept-Encoding` : 'Accept-Encoding'
        res.writeHead(response.statusCode ?? 502, out)
        response.pipe(zlib.createGzip({ level: 6, flush: zlib.constants.Z_SYNC_FLUSH })).pipe(res)
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
