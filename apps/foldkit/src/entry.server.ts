import { Effect } from 'effect'
import { Server } from 'foldkit/experimental'

import {
  allPostSummaries,
  benchmarkPaths,
  commentsFor,
  getPost,
  homeTopics,
  latestPostSummaries,
  posts,
  postsTagged,
  relatedPosts,
  searchIndex,
} from '@bench/content'

import { Flags, init } from './main'
import { view } from './view'

export const renderDocument = Server.renderDocument

export const prerenderPaths: ReadonlyArray<string> = [
  ...new Set([...benchmarkPaths, ...posts.map(post => `/blog/${post.slug}`)]),
]

const flagsForPath = (pathname: string): Flags => {
  const base = { summaries: [], byTopic: [], post: null, comments: [], searchItems: searchIndex() }
  const slug = pathname.match(/^\/blog\/([^/]+)\/?$/)?.[1]
  if (slug) {
    return { ...base, summaries: relatedPosts(slug), post: getPost(slug) ?? null, comments: commentsFor(slug) }
  }
  if (pathname.replace(/\/$/, '') === '/blog') {
    return { ...base, summaries: allPostSummaries() }
  }
  if (pathname === '/') {
    return { ...base, summaries: latestPostSummaries(), byTopic: homeTopics.map(topic => postsTagged(topic)) }
  }
  return base
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
