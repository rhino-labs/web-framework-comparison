// Shared, deterministic content for every framework under test.
//
// This module is safe to import from client code: it holds types, site
// metadata and small helpers. Posts, generated pages and the data loaders
// live in ./server.ts so no framework ships the content generator to the
// browser.

export type Block =
  | { type: 'p'; text: string }
  | { type: 'h2'; id: string; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'code'; text: string }
  | { type: 'quote'; text: string }

export type PostSummary = {
  slug: string
  title: string
  excerpt: string
  date: string
  readingMinutes: number
  tags: string[]
  author: string
}

export type Post = PostSummary & { blocks: Block[] }

export type Heading = { id: string; text: string }

export type Comment = { id: string; author: string; date: string; body: string }

export type SearchItem = { title: string; href: string }

export type HomeData = { latest: PostSummary[]; byTopic: PostSummary[][] }
export type BlogData = { posts: PostSummary[] }
export type PostData = { post: Post; related: PostSummary[]; comments: Comment[] }

export type PageLink = { title: string; href: string }

/** A section index page: /docs, /guides, … */
export type SectionData = {
  section: { slug: string; title: string; tagline: string }
  pages: (PageLink & { tagline: string })[]
}

/** A generated page inside a section. Its widgets are code, not data: each
 * page's route imports its own set of client components. */
export type FeatureData = {
  section: { slug: string; title: string }
  href: string
  title: string
  tagline: string
  /** One paragraph before the first widget and one after each widget. */
  paragraphs: string[]
  siblings: PageLink[]
}

/**
 * Size of the generated part of the site. Edit and rerun `pnpm generate`
 * (part of `pnpm build`) to resize the fixture.
 */
export const scale = {
  pagesPerSection: 8,
  /** Widgets owned by a section; each of its pages uses some of them. */
  sharedWidgetsPerSection: 4,
  sharedWidgetsPerPage: 2,
  uniqueWidgetsPerPage: 6,
}

export const sections = [
  { slug: 'docs', title: 'Docs', tagline: 'Reference material for the techniques we write about.' },
  { slug: 'guides', title: 'Guides', tagline: 'Step-by-step walkthroughs with working examples.' },
  { slug: 'tools', title: 'Tools', tagline: 'Small calculators and checklists for performance work.' },
  { slug: 'showcase', title: 'Showcase', tagline: 'Sites we measured, and what we learned from them.' },
  { slug: 'learn', title: 'Learn', tagline: 'Courses for teams adopting a performance budget.' },
  { slug: 'reference', title: 'Reference', tagline: 'Numbers, defaults and limits worth knowing.' },
]

export const site = {
  name: 'Field Notes',
  tagline: 'Essays on building for the web, one request at a time.',
  about: [
    'Field Notes is a small publication about the craft of building websites: performance budgets, rendering strategies, and the tradeoffs hiding behind framework defaults.',
    'This site exists as a benchmark fixture. The same pages, the same data and the same stylesheet are implemented in several frameworks so their production output can be compared fairly.',
    'Most of the site is static content. The interactive parts are client components: site chrome on every page, and a set of widgets on each docs, guides and tools page.',
  ],
}

export const WORDS =
  'render hydrate stream bundle chunk module route layout server client cache edge request response payload script style token budget island component signal effect state model view update browser network latency throughput compile tree shake split prefetch preload document fragment boundary suspense fallback manifest asset index static dynamic deploy worker runtime'.split(
    ' ',
  )

// Small deterministic PRNG so every build produces identical content.
export const rng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}

export const pick = <T,>(r: () => number, items: readonly T[]): T => items[Math.floor(r() * items.length)]!

export const capitalize = (s: string) => s[0]!.toUpperCase() + s.slice(1)

export const phrase = (r: () => number, min: number, max: number) =>
  capitalize(Array.from({ length: min + Math.floor(r() * (max - min + 1)) }, () => pick(r, WORDS)).join(' '))

export const sentence = (r: () => number, min = 8, max = 18) => phrase(r, min, max - 1) + '.'

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export const AUTHORS = ['Ada Park', 'Sam Okafor', 'Lena Varga', 'Theo Marsh']

export const team = AUTHORS.map((name, i) => ({
  name,
  role: ['Editor', 'Staff writer', 'Contributor', 'Contributor'][i]!,
  bio: sentence(rng(500 + i), 18, 30),
}))

export const faq = [
  { q: 'How often do you publish?', a: 'Roughly once a week. Long pieces take longer, and we would rather be late than wrong.' },
  { q: 'Can I republish an article?', a: 'Yes, with attribution and a link back to the original. Please do not edit the benchmarks.' },
  { q: 'Do you accept guest posts?', a: 'Occasionally. Pitch us with an outline and the measurements you plan to run.' },
  { q: 'Why does this site exist?', a: 'It is a benchmark fixture: the same site implemented in several frameworks so their output can be compared.' },
  { q: 'Is there an RSS feed?', a: 'Not in this prototype. A real site would have one, and it would be static.' },
]

/** Topics shown as tabs on the home page. */
export const homeTopics = ['performance', 'rendering', 'architecture']

export const headingsOf = (post: Post): Heading[] =>
  post.blocks.flatMap(b => (b.type === 'h2' ? [{ id: b.id, text: b.text }] : []))

export const PAGE_SIZE = 8

export const paginate = <T,>(items: T[], size = PAGE_SIZE): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size))

export const formatDate = (iso: string) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
