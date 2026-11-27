import { Router } from '@effect/ui'
import { HtmlServer } from '@effect/ui/html'
import { Effect, Layer } from 'effect'
import { HttpClient, HttpClientRequest, HttpClientResponse } from 'effect/http'

import { allPaths, blogData, featureData, homeData, postData, searchIndex, sectionData } from '@bench/content/server'
import { sections } from '@bench/content'

import { App } from './App.ts'
import { featureModules } from './generated/modules.ts'
import { AppRoute } from './routes.ts'
import { dataPath } from './services/Content.ts'

// The build-time entry: prerender.mjs calls `render` for every path and
// writes `dataFiles` next to the HTML.

export const paths: ReadonlyArray<string> = allPaths()

/** The JSON "API" of the static site: what `Content.layerHttp` fetches. */
export const dataFiles = (): ReadonlyMap<string, unknown> => {
  const files = new Map<string, unknown>([
    [dataPath.home, homeData()],
    [dataPath.blog, blogData()],
    [dataPath.search, searchIndex()],
  ])
  for (const section of sections) files.set(dataPath.section(section.slug), sectionData(section.slug))
  for (const path of paths) {
    const [first, second] = path.slice(1).split('/')
    if (first === 'blog' && second) files.set(dataPath.post(second), postData(second))
    else if (first && second) files.set(dataPath.feature(first, second), featureData(first, second))
  }
  return files
}

// The app reads its content through an `HttpClient`. At build time that is
// this one, which answers from the same files without a server. There is no
// page URL to resolve `/data` against, so it adds an origin of its own.
const origin = 'http://localhost'

const StaticClient = Layer.sync(HttpClient.HttpClient, () => {
  const files = dataFiles()
  return HttpClient.make((request, url) => {
    const body = files.get(url.pathname)
    return Effect.succeed(
      HttpClientResponse.fromWeb(
        request,
        body === undefined ? new Response('Not found', { status: 404 }) : Response.json(body),
      ),
    )
  }).pipe(HttpClient.mapRequest(HttpClientRequest.prependUrl(origin)))
})

/** The manifest key of the lazy chunk a path's page is in, if it has one. */
export const moduleOf = (path: string): string | undefined => featureModules[path]

// `static: true` is for HTML built at deploy. The server waits for a lazy
// page's module, so a generated page is rendered with its widgets.
export const render = (path: string) =>
  HtmlServer.renderToHtml(App, Router.props(AppRoute), { static: true, budget: '10 seconds' }).pipe(
    Effect.provide(Router.static({ routes: AppRoute, url: path })),
    Effect.provide(StaticClient),
    Effect.map(page => ({ ...page, state: HtmlServer.serializeState(page.state) })),
    Effect.runPromise,
  )
