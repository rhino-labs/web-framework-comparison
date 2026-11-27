# web-framework-comparison

An open benchmark that builds the same content site in several web frameworks:
Next.js, vinext, TanStack Start, React Router, Astro, Effect UI and Xote.
"Field Notes" has 153 pages: a home page, a blog with 96 articles, an about
page, and six sections of generated docs/guides/tools pages, each with its own
set of interactive widgets (312 client components in total). A Playwright
harness measures each production build: JS and CSS requests per page, JS
weight, and LCP and INP on a throttled 4G phone.

![chart](bench/results/chart.png?v=2026-11-26)

## Latest results

Run on 2026-11-26 (darwin, Node v24.21.0, Chromium 156.0.8078.4), every
server behind the same local HTTP/2 + gzip proxy. Averages over 10 pages.
Requests and weight are the mean of 3 cold loads and exclude prefetching
(see [What is measured](#what-is-measured)). LCP and INP are the median of
15 cold loads per page on the throttled phone, 150 per framework, taken in
rounds that alternate between the frameworks.

| Framework | JS requests | CSS requests | JS (gzip) | LCP | INP while loading | INP after load | Prefetched JS | Data requests |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Next.js 16.4.6 | 6.3 | 3.0 | 139 KiB | 490 ms | 198 ms | 32 ms | +2.9 (+6 KiB) | 27.2 |
| Vinext 1.4.7 | 9.2 | 5.2 | 157 KiB | 416 ms | 18 ms | 32 ms | +4.0 (+6 KiB) | 12.6 |
| TanStack Start 1.169.7 | 2.9 | 3.2 | 122 KiB | 408 ms | 123 ms | 32 ms | 0 | 0 |
| React Router 8.5.3 | 6.9 | 4.2 | 120 KiB | 435 ms | 154 ms | 32 ms | 0 | 1.0 |
| Astro 7.4.13 | 16.6 | 0 | 73 KiB | 255 ms | 14 ms | 32 ms | 0 | 0 |
| Effect UI 33dbab6 | 2.2 | 2.2 | 145 KiB | 406 ms | 144 ms | 33 ms | 0 | 0 |
| Xote 7.2.0 | 1.0 | 1.0 | 74 KiB | 431 ms | 150 ms | 32 ms | 0 | 0 |

Run-to-run spread is small: the interquartile range per page is 5 to 7 ms
for LCP and 4 to 9 ms for INP while loading, so differences of 20 ms or more
between frameworks are not noise.

Content pages (home, blog, articles, about, a section index) and generated
widget pages behave differently, so here is the split:

| Framework | Content pages: JS / CSS requests, JS gzip | Widget pages: JS / CSS requests, JS gzip |
| --- | --- | --- |
| Next.js | 6 / 3, 138 KiB | 7 / 3, 141 KiB |
| Vinext | 8 / 4, 156 KiB | 12 / 8, 159 KiB |
| TanStack Start | 2 / 2, 121 KiB | 5 / 6, 124 KiB |
| React Router | 6 / 3, 119 KiB | 9 / 7, 122 KiB |
| Astro | 15 / 0, 73 KiB | 20 / 0, 75 KiB |
| Effect UI | 1 / 1, 144 KiB | 5 / 5, 148 KiB |
| Xote | 1 / 1, 74 KiB | 1 / 1, 74 KiB |

Things worth noticing:

- **INP after load is the same everywhere**: 32 ms, the lowest value this
  setup produces for a tap (the Event Timing API reports in 8 ms steps).
  None of the fixture's interactions is heavy enough, in any framework, to
  take longer than a couple of frames on the throttled CPU. The one
  exception is Effect UI on the blog index, at 40 ms for a paginator tap.
- **INP while loading separates them**: Astro and vinext answer input within
  a frame or two even while they start up (14 and 18 ms), while the others
  hold the main thread for 120 to 200 ms as they hydrate. Next.js is the
  slowest at 198 ms. In a trace of one article page, Next.js evaluated its
  client runtime in a single 91 ms task and a key press queued behind it
  then took another 55 ms to handle; vinext's modules evaluated in 36 ms
  with no task over 50 ms. Vinext isn't interactive sooner, though: it
  finished hydrating about 570 ms later than Next.js, and until then its
  buttons do nothing.
- **Astro** ships the least JS of the React-based apps and paints first: the
  HTML has its CSS inlined and nothing blocks rendering, while each island
  then loads its own small module (hence the most JS requests).
- **Effect UI** ships the most JS after vinext: about 144 KiB of runtime
  (Effect, its Schema and HTTP modules, and the framework) on every page, in
  one chunk. It splits per page like the React frameworks: a generated page
  adds its own chunk and its widgets, about 4 KiB.
- **Xote** ships one bundle with every page and all 312 widgets, so its JS
  grows with the size of the site, not the page. It is still the smallest
  bundle here (ReScript and signals).
- **The React frameworks** split per route and only load the widgets a page
  uses: about 3 KiB more on widget pages.
- **Next.js** groups a route's client components into one chunk, but ships
  the CSS of all widgets on every page (10.8 KiB gzip of CSS, against about
  3.5 KiB in the other React apps).
- **React Router 8** ships about 4 KiB more JS than 7.18.4 did, all in its
  own runtime (the router chunk and the client entry); the React chunk is a
  little smaller.
- **Vinext** splits the most among the React frameworks: one more JS and CSS
  file per widget group.
- **Next.js and vinext** prefetch the routes linked in the viewport after the
  page has loaded: RSC payloads (the data column) and, for widget pages, their
  JS. That doesn't delay the page, so it's reported separately.

Raw data, including a per-page breakdown and every request for one sample
load, is in [`bench/results/latest.json`](bench/results/latest.json).

These numbers come from one machine. Run the benchmark yourself before
drawing conclusions, and please open an issue if a framework's implementation
isn't idiomatic.

## Frameworks

| Framework      | App                   | Rendering                       | Server used for the bench |
| -------------- | --------------------- | ------------------------------- | ------------------------- |
| Next.js        | `apps/next`           | App Router, RSC, SSG            | `next start`              |
| Vinext         | `apps/next` (same!)   | the same `app/` dir, built by Vite | `vinext start`         |
| TanStack Start | `apps/tanstack-start` | SSR, data via `createServerFn`  | `vite preview`            |
| React Router 8 | `apps/react-router`   | framework mode, SSR, server loaders | `react-router-serve`  |
| Astro          | `apps/astro`          | SSG, React islands (`client:load`) | static files           |
| Effect UI      | `apps/effect-ui`      | SSG + hydration, lazy pages, data via `Query` | static files  |
| Xote (ReScript) | `apps/xote`          | SSG + hydration, signals, data in a JSON script | static files |

## The fixture

- **`packages/content`**: deterministic content. `@bench/content` is the
  client-safe part (types, site copy, formatting helpers, a global stylesheet
  with only tokens and a reset). `@bench/content/server` has the posts, the
  generated pages, the widget specs and the data each route loads, and is
  only imported by loaders, server functions and server components.
- **`packages/react-ui`**: every component and page body, each component with
  its own CSS module. All four React apps render these same components; the
  only per-framework code is routing, data loading and a `Link` adapter.
  - Site chrome and content pages, hand-written: theme toggle, mobile menu,
    search dialog (⌘K, searching all 150 pages), newsletter form,
    back-to-top, cookie banner, like button, share menu, code copy button,
    table of contents with scroll-spy, reading progress bar, topic tabs,
    paginator, FAQ accordion, contact form, and comments (a `React.lazy`
    chunk, loaded when scrolled into view). Static components (header,
    footer, cards, breadcrumbs, …) are server components in Next/vinext.
  - Generated pages: 6 sections × 8 pages. Each page renders 8 widgets: 2
    shared with the rest of its section and 6 of its own. There are 10 widget
    kinds (stepper, switches, disclosure, segmented control, rating, poll,
    slider, filterable list, carousel, checklist), and each of the 312
    widgets is its own module with its own constants and CSS module.
- **`scripts/generate.ts`** writes the widgets, the generated page modules and
  one route file per page for Next.js/vinext, TanStack Start and React
  Router, plus the Effect UI and Xote versions of the widgets and pages. Its
  output is gitignored
  and rebuilt by `pnpm build`. Resize the site with `scale` in
  `packages/content/src/index.ts`.
- **Effect UI** reimplements the same pages and widgets as components with
  Schemas for their Model and messages (`apps/effect-ui/src`), and imports
  the same CSS modules from `@bench/react-ui`, so the markup and styles
  match. It is laid out as the Effect UI docs describe: a root that holds the
  route, a page per route, each page loading its data with a `Query` and
  providing its own Layers. Each generated page is a `Component.lazy` chunk
  with its 8 widgets, and so are the comments. Effect UI has no static-site
  command yet, so `apps/effect-ui/prerender.mjs` does that step: it renders
  every path with `HtmlServer.renderToHtml`, embeds the state for
  `HtmlHydrate.hydrate`, and writes one JSON file per page for the queries to
  fetch on client-side navigation.
- **Xote** reimplements the pages and widgets in ReScript with signals (`apps/xote/src`), with
  the same markup and CSS modules. Xote is a UI library rather than a
  framework, so `apps/xote/prerender.mjs` does the static generation: it
  renders every path with `SSR.renderToStringWithRoot` and embeds the page's
  data for `Hydration.hydrateById`.
- **Astro** renders the shared React components to HTML, with every
  interactive component as a React island using `client:load` (the same
  components hydrate at load as in the other React apps). Layouts and pages
  are `.astro` files, since islands are placed from Astro templates; the
  topic tabs and the blog paginator get small island wrappers that render
  their own panels.

## Usage

Requires Node 24+ (the bench scripts are TypeScript run directly by Node) and pnpm 10.

```sh
corepack enable          # or: npx pnpm@10 ...
pnpm install
pnpm build               # generates the fixture, then builds every app (Next.js and vinext both build apps/next)
pnpm bench               # starts each prod server, measures, writes bench/results/latest.json
pnpm chart               # renders bench/results/chart.{html,png}
```

Options:

```sh
pnpm bench --only next,effect-ui --runs 5 --phone-runs 30 --settle 1000
pnpm chart --highlight tanstack-start --title "My title" --subtitle "..."
```

## What is measured

For each framework, each page in `benchmarkPaths` is loaded `--runs` times. Every
load uses a fresh browser context, so the cache is cold. The harness waits for
`networkidle` plus a settle period (default 1s), which lets idle-time work such
as viewport link prefetching happen.

- **Servers**: frameworks with a server run their own production server;
  frameworks whose output is static files (Astro, Effect UI, Xote) are served by
  `bench/src/static-server.ts`, which resolves `/about` to `about/index.html`
  like a static host.
- **HTTP/2 and compression, like a CDN**: every server is put behind the same
  small local HTTPS + HTTP/2 proxy (`bench/src/h2proxy.ts`, self-signed
  certificate). The framework servers only speak HTTP/1.1, where Chromium
  opens at most 6 connections per origin and a page with many parallel
  requests queues behind itself. The proxy also asks every server for
  uncompressed responses and gzips all text itself (level 6), because the
  servers' own defaults differ (brotli, gzip or nothing). The harness checks
  that every page was served over `h2`, and that its `<h1>` is the one the
  path should render.
- **Requests per page**: the JS and CSS the page loads, including code it
  imports after the `load` event to hydrate (Astro islands). JS and CSS that
  starts after the `load` event *and* after the page's first fetch/XHR is
  counted as prefetch instead: that is how Next/vinext prefetch linked routes
  (the RSC payload first, then the route's chunks). Fetch/XHR requests (RSC
  prefetches, server-function calls, route manifests) are recorded as
  `data`. Neither prefetch nor data is part of the chart.
- **JS per page (gzip)**: every JS response body the page loads (as above),
  gzipped locally at level 6.
- **The phone**: a 390×844 mobile viewport with touch input, the network
  throttled to 150 ms RTT and 5 Mbit/s and the CPU to 4× slower, the same
  profile as the vinext 1.3 post. The cache is cold on every load.
- **Sample size**: the phone measurements run in `--phone-runs` rounds
  (default 15). A round loads each benchmark page of each framework twice,
  once for LCP and the interaction script and once for INP while loading, so
  the default is 300 page loads per framework. Rounds alternate between the
  frameworks, with every server running throughout, so a change in the
  machine's state during the benchmark affects all of them alike. Tables
  show the median per page, averaged over pages; `latest.json` also has the
  25th and 75th percentile and every single run.
- **LCP**: read once the page is idle, before any input. FCP and the load
  event are recorded too.
- **INP after load**: once the page is idle, the harness runs a fixed script
  of 17 to 27 taps and key presses, depending on the page, under the same CPU throttle: open and
  close the menu, toggle the theme, open the search dialog and type a query,
  close it, accept cookies, type into the newsletter form and submit it,
  then tap up to 10 of the page's own buttons (tabs, paginator, accordion,
  like, share, widgets). Each step waits for the next frame. INP is the
  slowest interaction, as the Event Timing API reports it (with fewer than
  50 interactions, that is what INP means). The API rounds durations to
  8 ms and doesn't report interactions under 16 ms.
- **INP while loading**: on a second cold load, the harness presses a key
  every 50 ms from the first paint until the page is idle. Nothing has
  focus, so the key does nothing, but a press that arrives while the main
  thread is busy parsing, hydrating or rendering has to wait for it. The
  slowest press shows how long the page can leave input unanswered while it
  starts up.
- **Sanity check**: after load, the harness clicks the theme toggle and checks
  that it worked. A page that failed to hydrate is reported with a `!` warning.

The chart shows the average over all benchmark pages. `latest.json` has a
per-page breakdown, plus a sample list of every request for the first run.

## Adding a framework

1. Create `apps/<name>` with a `build:all` script. A React framework should
   render the page components from `@bench/react-ui` and import
   `@bench/content/styles.css`. A non-React framework should port the pages and
   import the same CSS modules.
2. Add an entry to `bench/src/targets.ts`, with the production start command
   and a free port.

## Fairness notes and caveats

- **TanStack Start** loaders are isomorphic. Calling `@bench/content/server` directly
  from a loader would ship every post to the client, so the data goes through
  `createServerFn`, which is the idiomatic pattern.
- **Effect UI** is experimental and not on npm yet. The app installs the
  pkg.pr.new snapshot of commit `33dbab6` (2026-11-26), so the chart shows
  that commit instead of a version. Its API may change.
- **Effect UI** pages are prerendered with `static: true`, and each page's
  query results travel in the page state. The queries never go stale
  (`staleTime: "Infinity"`), so a page makes no data requests when it loads.
  Following a link is a client-side navigation: it fetches that page's JSON
  file and, for a generated page, its chunk.
- **Effect UI** hydration doesn't wait for a lazy component: opened directly,
  a lazy page would be replaced by its fallback until its chunk arrives. The
  entry module (`apps/effect-ui/src/main.ts`) therefore calls the page's
  `preload()` before it hydrates, and `prerender.mjs` adds `modulepreload`
  and stylesheet links for the page's chunk, as the other frameworks' build
  tools do. Without those links the chunk would load one round trip later.
- **React Router** uses its defaults: `<Link>` doesn't prefetch, and lazy route
  discovery makes one `/__manifest` request per page, which counts as `data`.
  Framework-mode loaders run only on the server, so the content stays out of
  the client bundle.
- **Next/vinext** prefetch links in the viewport. Those RSC requests count as
  `data`, not JS. Any route chunks that prefetching pulls in do count as JS.
- **Xote** has no lazy loading in this port: the comments code and every
  generated widget are in one bundle, and links do full page loads. Only what
  renders depends on the page.
- **Astro** inlines small stylesheets into the HTML by default
  (`build.inlineStylesheets: 'auto'`), so it makes no CSS requests. It also
  hydrates each island separately, which is where its JS request count comes
  from. Using `client:visible` or `client:idle` for below-the-fold widgets,
  as most Astro sites would, would load less at first.
- **Xote**: two workarounds for hydration issues found in 7.1.0 are still in
  place under 7.2.0 (whether 7.2.0 still needs them is untested), both commented in
  `apps/xote/src/Ui.res`: static empty content is an empty array rather than
  `View.null()`, and conditionals that start out empty are written as an
  explicit `View.tracked` block.
- Each framework gets the data a page renders through its own serialization:
  RSC payload, loader data, server-function results, Effect UI's page state
  or a JSON script (Xote). The
  search index (150 entries) is part of that data on every page.
- LCP runs on localhost with emulated throttling, so it captures round trips,
  bandwidth and CPU, but not real TLS, DNS or CDN behavior.
- INP here is a lab number from a scripted session. Field INP is the 75th
  percentile over real visits, with real devices and whatever people tap.
- On a phone the page lays out wider than the screen in places (the fixture
  has no narrow-screen styles), and the first buttons of the blog paginator
  are off screen. The interaction script skips buttons it can't reach, the
  same ones in every framework.

## Corrections

- **2026-10-27**: Foldkit results published before this date were measured
  on its home page for every path. `vite preview` serves the root
  `index.html` for paths without a trailing slash, such as `/about`.
  Foldkit's JS numbers were unaffected (it ships one bundle everywhere), but
  its HTML, CSS and LCP numbers were wrong. Static sites are now served by
  `bench/src/static-server.ts`, and the harness checks every page's `<h1>`.
- **2026-10-27**: LCP numbers published before this date compared servers
  with different compression (brotli, gzip or none). The proxy now
  normalizes compression.

## License

[MIT](LICENSE)
