import { Effect } from 'effect'
import { Server } from 'foldkit/experimental'

import { allPaths, blogData, featureData, homeData, postData, searchIndex, sectionData } from '@bench/content/server'

import { Flags, init } from './main'
import { view } from './view'

export const renderDocument = Server.renderDocument

export const prerenderPaths: ReadonlyArray<string> = allPaths()

// NOTE: each page gets only the data it renders, the same payload the React
// frameworks serialize for hydration.
const flagsForPath = (pathname: string): Flags => {
  const path = pathname.replace(/(.)\/$/, '$1')
  const base: Flags = {
    summaries: [],
    byTopic: [],
    post: null,
    section: null,
    feature: null,
    comments: [],
    searchItems: searchIndex(),
  }
  if (path === '/') {
    const { latest, byTopic } = homeData()
    return { ...base, summaries: latest, byTopic }
  }
  if (path === '/blog') {
    return { ...base, summaries: blogData().posts }
  }
  const [first, second] = path.slice(1).split('/')
  if (first === 'blog' && second) {
    const data = postData(second)
    return data ? { ...base, summaries: data.related, post: data.post, comments: data.comments } : base
  }
  if (first && second) {
    return { ...base, feature: featureData(first, second) ?? null }
  }
  return first ? { ...base, section: sectionData(first) ?? null } : base
}

export const renderPage = (request: Request): Promise<Server.EntryResult> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const renderedApplication = yield* Server.renderToString(
        { Flags, routing: {}, init, view },
        { url: request.url, flags: flagsForPath(new URL(request.url).pathname) },
      )
      return Server.Rendered(renderedApplication)
    }),
  )
