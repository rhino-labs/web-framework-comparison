import { Context, Effect, Layer, Schema } from 'effect'
import { HttpClient, HttpClientResponse } from 'effect/http'

import {
  BlogData,
  ContentNotFound,
  FeatureData,
  HomeData,
  PostData,
  SearchItem,
  SectionData,
} from '#domain/Content'

// Where each page's data lives. The site is static, so the "API" is one JSON
// file per page, written next to the HTML by prerender.mjs. A prerendered
// page ships its query results in the page state, so these are only fetched
// on client-side navigation.
export const dataPath = {
  home: '/data/home.json',
  blog: '/data/blog.json',
  search: '/data/search.json',
  post: (slug: string) => `/data/blog/${slug}.json`,
  section: (section: string) => `/data/${section}.json`,
  feature: (section: string, slug: string) => `/data/${section}/${slug}.json`,
}

// All of the UI's I/O goes through this service; the queries capture it. It
// needs only an `HttpClient`, which the entry modules provide: fetch in the
// browser, and an in-process client at build time (src/prerender.ts).
export class Content extends Context.Service<
  Content,
  {
    readonly home: Effect.Effect<HomeData>
    readonly blog: Effect.Effect<BlogData>
    readonly search: Effect.Effect<ReadonlyArray<SearchItem>>
    post(slug: string): Effect.Effect<PostData, ContentNotFound>
    section(section: string): Effect.Effect<SectionData, ContentNotFound>
    feature(section: string, slug: string): Effect.Effect<FeatureData, ContentNotFound>
  }
>()('app/Content') {
  static readonly layerHttp = Layer.effect(
    Content,
    Effect.gen(function* () {
      const client = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk)

      const get = <S extends Schema.Top>(path: string, schema: S) =>
        client.get(path).pipe(Effect.flatMap(HttpClientResponse.schemaBodyJson(schema)))

      const find = <S extends Schema.Top>(path: string, schema: S) =>
        get(path, schema).pipe(Effect.mapError(() => new ContentNotFound({ path })))

      return Content.of({
        home: Effect.orDie(get(dataPath.home, HomeData)),
        blog: Effect.orDie(get(dataPath.blog, BlogData)),
        search: Effect.orDie(get(dataPath.search, Schema.Array(SearchItem))),
        post: slug => find(dataPath.post(slug), PostData),
        section: section => find(dataPath.section(section), SectionData),
        feature: (section, slug) => find(dataPath.feature(section, slug), FeatureData),
      })
    }),
  )
}
