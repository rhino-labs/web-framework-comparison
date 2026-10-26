// Shared, deterministic content for every framework under test.
// Every app renders exactly these pages from exactly this data.

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

export const site = {
  name: 'Field Notes',
  tagline: 'Essays on building for the web, one request at a time.',
  about: [
    'Field Notes is a small publication about the craft of building websites: performance budgets, rendering strategies, and the tradeoffs hiding behind framework defaults.',
    'This site exists as a benchmark fixture. The same pages, the same data and the same stylesheet are implemented in several frameworks so their production output can be compared fairly.',
    'Each implementation keeps two small interactive islands: a theme toggle in the header and a like button on every article. Everything else is static content.',
  ],
}

const WORDS =
  'render hydrate stream bundle chunk module route layout server client cache edge request response payload script style token budget island component signal effect state model view update browser network latency throughput compile tree shake split prefetch preload document fragment boundary suspense fallback manifest asset index static dynamic deploy worker runtime'.split(
    ' ',
  )

const TOPICS = [
  'Shipping Less JavaScript',
  'The Cost of Hydration',
  'Streaming Server Rendering',
  'Islands in Practice',
  'Measuring What Matters',
  'Route-Level Code Splitting',
  'CSS Without the Waterfall',
  'Prefetching Done Right',
  'Edge Rendering Tradeoffs',
  'Designing a Performance Budget',
  'Resumability Explained',
  'The Elm Architecture on the Web',
  'Effects as Values',
  'Static Generation at Scale',
  'Caching Server Components',
  'Typed Routing',
  'Fonts and Layout Shift',
  'Images Are Still the Problem',
  'Benchmarking Frameworks Honestly',
  'Bundle Analysis Workflows',
  'Progressive Enhancement Today',
  'Client Navigation Costs',
  'Module Graph Hygiene',
  'The Long Tail of Third Parties',
]

const AUTHORS = ['Ada Park', 'Sam Okafor', 'Lena Varga', 'Theo Marsh']
const TAGS = ['performance', 'rendering', 'architecture', 'css', 'tooling', 'react', 'effect']

// Small deterministic PRNG so every build produces identical content.
const rng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}

const sentence = (r: () => number, min = 8, max = 18) => {
  const n = min + Math.floor(r() * (max - min))
  const words = Array.from({ length: n }, () => WORDS[Math.floor(r() * WORDS.length)]!)
  const s = words.join(' ')
  return s[0]!.toUpperCase() + s.slice(1) + '.'
}

const paragraph = (r: () => number) =>
  Array.from({ length: 3 + Math.floor(r() * 3) }, () => sentence(r)).join(' ')

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const makePost = (title: string, i: number): Post => {
  const r = rng(i + 1)
  const blocks: Block[] = [{ type: 'p', text: paragraph(r) }]
  for (let s = 0; s < 5; s++) {
    const heading = sentence(r, 3, 6).replace(/\.$/, '')
    blocks.push({ type: 'h2', id: `${s + 1}-${slugify(heading)}`, text: heading })
    blocks.push({ type: 'p', text: paragraph(r) })
    if (s % 2 === 0) blocks.push({ type: 'ul', items: [sentence(r, 4, 9), sentence(r, 4, 9), sentence(r, 4, 9)] })
    if (s === 1) blocks.push({ type: 'code', text: `export function ${slugify(title).replace(/-/g, '_')}() {\n  return render(model, view)\n}` })
    if (s === 3) blocks.push({ type: 'quote', text: sentence(r, 10, 16) })
    blocks.push({ type: 'p', text: paragraph(r) })
  }
  const date = new Date(Date.UTC(2026, 9, 24) - i * 6 * 86400000)
  const words = blocks.reduce((n, b) => n + JSON.stringify(b).split(' ').length, 0)
  return {
    slug: slugify(title),
    title,
    excerpt: sentence(r, 16, 24),
    date: date.toISOString().slice(0, 10),
    readingMinutes: Math.max(2, Math.round(words / 220)),
    tags: [TAGS[i % TAGS.length]!, TAGS[(i + 3) % TAGS.length]!],
    author: AUTHORS[i % AUTHORS.length]!,
    blocks,
  }
}

export const posts: Post[] = TOPICS.map(makePost)

export const summarize = ({ blocks: _blocks, ...summary }: Post): PostSummary => summary

export const allPostSummaries = (): PostSummary[] => posts.map(summarize)

export const latestPostSummaries = (n = 6): PostSummary[] => allPostSummaries().slice(0, n)

export const getPost = (slug: string): Post | undefined => posts.find(p => p.slug === slug)

export const relatedPosts = (slug: string, n = 3): PostSummary[] => {
  const i = posts.findIndex(p => p.slug === slug)
  return Array.from({ length: n }, (_, k) => summarize(posts[(i + k + 1) % posts.length]!))
}

export type Heading = { id: string; text: string }

export const headingsOf = (post: Post): Heading[] =>
  post.blocks.flatMap(b => (b.type === 'h2' ? [{ id: b.id, text: b.text }] : []))

export type Comment = { id: string; author: string; date: string; body: string }

const COMMENTERS = ['jules', 'mkr', 'devon.p', 'aiko', 'rafael', 'noor', 'pip']

export const commentsFor = (slug: string): Comment[] => {
  const i = posts.findIndex(p => p.slug === slug)
  const r = rng(1000 + i)
  return Array.from({ length: 4 + (i % 4) }, (_, k) => ({
    id: `${slug}-c${k}`,
    author: COMMENTERS[(i + k) % COMMENTERS.length]!,
    date: posts[i]!.date,
    body: sentence(r, 10, 26),
  }))
}

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

export const postsTagged = (tag: string, n = 4): PostSummary[] =>
  allPostSummaries().filter(p => p.tags.includes(tag)).slice(0, n)

/** Lightweight index for the client-side search dialog. */
export const searchIndex = (): { title: string; href: string }[] =>
  posts.map(p => ({ title: p.title, href: `/blog/${p.slug}` }))

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

/** The pages the benchmark visits, identical for every framework. */
export const benchmarkPaths = [
  '/',
  '/blog',
  '/about',
  `/blog/${posts[0]!.slug}`,
  `/blog/${posts[7]!.slug}`,
  `/blog/${posts[15]!.slug}`,
]
