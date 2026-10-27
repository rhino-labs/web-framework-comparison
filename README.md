# web-framework-comparison

An open benchmark that builds the same content site in several web frameworks.
"Field Notes" has 153 pages: a home page, a blog with 96 articles, an about
page, and six sections of generated docs/guides/tools pages, each with its own
set of interactive widgets (312 client components in total). A Playwright
harness measures each production build: JS and CSS requests per page, JS
weight, and LCP on a throttled 4G phone.

![chart](bench/results/chart.png)

## Latest results

Run on 2026-10-26 (darwin, Node v24.21.0, Chromium 156.0.8078.4), every
server behind the same local HTTP/2 proxy. Averages over 10 pages. Requests
and weight count what a page loads before its `load` event (mean of 3 cold
loads); LCP is the median of 5 cold loads per page.

| Framework | JS requests | CSS requests | JS (gzip) | LCP, 4G phone | JS after load (prefetch) | Data requests |
| --- | --- | --- | --- | --- | --- | --- |
| Next.js 16.4.3 | 6.3 | 3.0 | 139 KiB | 505 ms | +2.9 (+6 KiB) | 27.2 |
| Vinext 1.3.1 | 9.2 | 5.2 | 153 KiB | 452 ms | +4.0 (+6 KiB) | 12.6 |
| TanStack Start 1.169.4 | 3.9 | 4.2 | 123 KiB | 426 ms | 0 | 0 |
| React Router 7.18.4 | 6.9 | 4.2 | 116 KiB | 445 ms | 0 | 1.0 |
| Foldkit 0.169.0 | 1.0 | 1.0 | 159 KiB | 477 ms | 0 | 0 |

Content pages (home, blog, articles, about, a section index) and generated
widget pages behave differently, so here is the split:

| Framework | Content pages: JS / CSS requests, JS gzip | Widget pages: JS / CSS requests, JS gzip |
| --- | --- | --- |
| Next.js | 6 / 3, 138 KiB | 7 / 3, 141 KiB |
| Vinext | 8 / 4, 152 KiB | 12 / 8, 155 KiB |
| TanStack Start | 3 / 3, 122 KiB | 6 / 7, 125 KiB |
| React Router | 6 / 3, 115 KiB | 9 / 7, 118 KiB |
| Foldkit | 1 / 1, 159 KiB | 1 / 1, 159 KiB |

Things worth noticing:

- **Foldkit** ships one bundle with every page and all 312 widgets, so its JS
  grows with the size of the site, not the page. The React frameworks split
  per route and only load the widgets a page uses.
- **Next.js** groups a route's client components into one chunk (+1 request
  on widget pages), but ships the CSS of all widgets on every page (10.8 KiB
  gzip of CSS, against about 3.5 KiB elsewhere).
- **Vinext** splits the most: one more JS and CSS file per widget group.
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
| React Router 7 | `apps/react-router`   | framework mode, SSR, server loaders | `react-router-serve`  |
| Foldkit        | `apps/foldkit`        | SSG + hydration, data via Flags | `vite preview` (static)   |

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
  Router, plus the Foldkit versions of the widgets. Its output is gitignored
  and rebuilt by `pnpm build`. Resize the site with `scale` in
  `packages/content/src/index.ts`.
- **Foldkit** reimplements the same pages and widgets in Elm style, and imports
  the same CSS modules from `@bench/react-ui`, so the markup and styles match.
  Each generated widget is a submodel with its own `init`, `update` and
  `view`.

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
pnpm bench --only next,foldkit --runs 5 --phone-runs 9 --settle 1000
pnpm chart --highlight tanstack-start --title "My title" --subtitle "..."
```

## What is measured

For each framework, each page in `benchmarkPaths` is loaded `--runs` times. Every
load uses a fresh browser context, so the cache is cold. The harness waits for
`networkidle` plus a settle period (default 1s), which lets idle-time work such
as viewport link prefetching happen.

- **HTTP/2**: every framework's production server is put behind the same small
  local HTTPS + HTTP/2 proxy (`bench/src/h2proxy.ts`, self-signed certificate).
  The framework servers only speak HTTP/1.1, where Chromium opens at most 6
  connections per origin and a page with many parallel requests queues behind
  itself, which no CDN-served site would. The harness checks that every page
  was served over `h2`.
- **Requests per page**: JS and CSS responses that started before the page's
  `load` event. Requests that start after it (link prefetching, idle work) are
  recorded separately as "after load". Fetch/XHR requests (Next/vinext RSC
  prefetches, server-function calls, route manifests) are recorded as `data`.
  Neither is part of the chart.
- **JS per page (gzip)**: every JS response body that loaded before the `load`
  event, gzipped locally at level 6. This puts all servers on equal terms,
  whether or not they compress their responses themselves.
- **LCP on a 4G phone**: each page is loaded `--phone-runs` times (default 5)
  in a 390×844 mobile viewport. The network is throttled to 150 ms RTT and
  5 Mbit/s and the CPU to 4× slower, the same profile as the vinext 1.3 post.
  The cache is cold. The chart uses the median LCP per page, averaged over
  pages. FCP and the load event are recorded too.
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
- **Foldkit** pages are prerendered, and each page's data goes to the client
  in Flags. Foldkit has no RSC-style data fetching on client navigation, so
  links do a full document load (MPA style). This doesn't change initial-load
  numbers, but it does mean Foldkit makes no prefetch requests at all.
- **React Router** uses its defaults: `<Link>` doesn't prefetch, and lazy route
  discovery makes one `/__manifest` request per page, which counts as `data`.
  Framework-mode loaders run only on the server, so the content stays out of
  the client bundle.
- **Next/vinext** prefetch links in the viewport. Those RSC requests count as
  `data`, not JS. Any route chunks that prefetching pulls in do count as JS.
- **Foldkit** has no lazy loading in this port: the comments code and every
  generated widget are in the main bundle; only their rendering depends on
  the page.
- Each framework gets the data a page renders through its own serialization:
  RSC payload, loader data, server-function results or Foldkit Flags. The
  search index (150 entries) is part of that data on every page.
- LCP runs on localhost with emulated throttling, so it captures round trips,
  bandwidth and CPU, but not real TLS, DNS or CDN behavior.

## License

[MIT](LICENSE)
