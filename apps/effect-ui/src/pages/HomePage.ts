import { Component, Head, UiSchema } from '@effect/ui'
import { Html } from '@effect/ui/html'
import { Layer, Schema } from 'effect'
import { AsyncResult } from 'effect/reactivity'

import { homeTopics, site } from '@bench/content'
import tabs from '@bench/react-ui/Tabs.module.css'

import { Hero, PostList, SectionTitle } from '#components/views'
import { GetHome } from '#queries/GetHome'

import { blogUrl } from '../routes.ts'
import { Content } from '../services/Content.ts'

const HomePageMessage = UiSchema.TaggedEnum({ ClickedTopic: { index: Schema.Number } })

export const HomePageNoDeps = Html.component({
  name: 'HomePage',
  // The Model holds what the reader did. The posts are the query's result,
  // which the runtime keeps beside the Model.
  model: Schema.Struct({ topic: Schema.Number }),
  message: HomePageMessage,
  queries: { home: { query: GetHome, args: () => ({}) } },
}).make({
  init: () => ({ topic: 0 }),
  update: { ClickedTopic: ($, { index }) => $.evolve({ topic: index }) },
  head: () => [Head.title(site.name)],
  view: (h, model) =>
    AsyncResult.match(h.queries.home, {
      onInitial: () => h.div(Hero(h, site.name, site.tagline)),
      onFailure: () => h.div(Hero(h, site.name, site.tagline)),
      onSuccess: ({ value: data }) =>
        h.div(
          Hero(h, site.name, site.tagline),
          SectionTitle(h, 'Latest'),
          PostList(h, data.latest),
          SectionTitle(h, 'Browse by topic'),
          h.div(
            h.div.class(tabs.tablist).attr('role', 'tablist').children(
              homeTopics.map((label, index) =>
                h.button
                  .key(label)
                  .class(tabs.tab)
                  .attrs({ role: 'tab', 'aria-selected': String(index === model.topic) })
                  .on('click', HomePageMessage.ClickedTopic({ index }))
                  .children(label),
              ),
            ),
            data.byTopic.map((posts, index) =>
              h.div
                .key(homeTopics[index] ?? String(index))
                .attrs({ role: 'tabpanel', hidden: index === model.topic ? undefined : '' })
                .children(PostList(h, posts)),
            ),
          ),
          h.p(h.a.attr('href', blogUrl).children('All posts →')),
        ),
    }),
})

export const HomePage = HomePageNoDeps.pipe(Component.provide(GetHome.layer.pipe(Layer.provide(Content.layerHttp))))
