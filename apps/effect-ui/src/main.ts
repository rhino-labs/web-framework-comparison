import { Router } from '@effect/ui'
import { BrowserHost, BrowserRouter, HtmlHydrate } from '@effect/ui/html'
import { Effect, Layer } from 'effect'
import { FetchHttpClient } from 'effect/http'

import '@bench/content/styles.css'

import { App } from './App.ts'
import { preloadFeaturePage } from './generated/FeaturePage.ts'
import { AppRoute } from './routes.ts'

const root = document.getElementById('root')!
const state = document.getElementById('state')?.textContent

// Prerendered pages ship their HTML and the state it was rendered from, and
// `HtmlHydrate.hydrate` adopts both. `BrowserHost.mount` renders fresh in dev.
// The Router and the HTTP client are the only Layers here: the pages provide
// their own domain Layers.
const Main = (
  state
    ? HtmlHydrate.hydrate(App, Router.props(AppRoute), root, JSON.parse(state))
    : BrowserHost.mount(App, Router.props(AppRoute), root)
).pipe(Layer.provide([BrowserRouter.layer({ routes: AppRoute }), FetchHttpClient.layer]))

// A generated page is a lazy chunk. Hydration doesn't wait for one, so the
// page opened directly loads its chunk first and adopts the server's nodes
// instead of replacing them with a fallback.
preloadFeaturePage(location.pathname.replace(/(.)\/$/, '$1'))
  .catch(() => {})
  .then(() => Layer.launch(Main).pipe(Effect.runFork))

// A browser may keep a failed chunk and fail every later load of it.
window.addEventListener('vite:preloadError', () => location.reload())
