import { Component, Head } from '@effect/ui'
import { Html } from '@effect/ui/html'
import { Layer, Schema } from 'effect'
import { AsyncResult } from 'effect/reactivity'

import { site } from '@bench/content'
import feature from '@bench/react-ui/FeatureLayout.module.css'

import { Breadcrumbs, Hero, NotFound } from '#components/views'
import { GetSection } from '#queries/GetSection'

import { homeUrl } from '../routes.ts'
import { Content } from '../services/Content.ts'

export const SectionPageNoDeps = Html.component({
  name: 'SectionPage',
  props: Schema.Struct({ section: Schema.String }),
  model: Schema.Struct({}),
  message: Schema.Never,
  queries: { section: { query: GetSection, args: ({ props }) => ({ section: props.section }) } },
}).make({
  init: () => ({}),
  update: $ => $.model,
  head: ({ queries }) => [
    Head.title(
      AsyncResult.isSuccess(queries.section) ? `${queries.section.value.section.title} | ${site.name}` : site.name,
    ),
  ],
  view: h =>
    AsyncResult.match(h.queries.section, {
      onInitial: () => h.div,
      onFailure: () => NotFound(h),
      onSuccess: ({ value: { pages, section } }) =>
        h.div(
          Breadcrumbs(h, [{ label: 'Home', href: homeUrl }, { label: section.title }]),
          Hero(h, section.title, section.tagline),
          h.ul.class(feature.cards).children(
            pages.map(page =>
              h.li
                .key(page.href)
                .class(feature.card)
                .children(
                  h.a.attr('href', page.href).class(feature.cardLink).children(page.title),
                  h.p.class(feature.cardText).children(page.tagline),
                ),
            ),
          ),
        ),
    }),
})

export const SectionPage = SectionPageNoDeps.pipe(
  Component.provide(GetSection.layer.pipe(Layer.provide(Content.layerHttp))),
)
