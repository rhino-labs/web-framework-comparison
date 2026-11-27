import { Head, type View } from '@effect/ui'
import type { Html } from '@effect/ui/html'
import { Layer } from 'effect'
import { AsyncResult } from 'effect/reactivity'

import { site } from '@bench/content'
import article from '@bench/react-ui/Article.module.css'
import feature from '@bench/react-ui/FeatureLayout.module.css'

import { Breadcrumbs, NotFound } from '#components/views'
import type { ContentNotFound, FeatureData } from '#domain/Content'
import { GetFeature } from '#queries/GetFeature'

import { homeUrl, sectionUrl } from '../routes.ts'
import { Content } from '../services/Content.ts'

// What the generated pages (src/generated/pages) share: the layout around
// their widgets, their title, and the Layer of the query they load.

type FeatureResult = AsyncResult.AsyncResult<FeatureData, ContentNotFound>

export const featureLayer = GetFeature.layer.pipe(Layer.provide(Content.layerHttp))

export const featureHead = (result: FeatureResult) => [
  Head.title(AsyncResult.isSuccess(result) ? `${result.value.title} | ${site.name}` : site.name),
]

/** The layout of a generated page. `body` is the page's own part: its
 * widgets, each followed by a paragraph of copy. */
export const FeatureView = <M, C extends View.Children<M>>(
  h: Html.H<M>,
  result: FeatureResult,
  body: (data: FeatureData) => C,
) =>
  AsyncResult.match(result, {
    onInitial: () => h.div.class(feature.layout),
    onFailure: () => NotFound(h),
    onSuccess: ({ value: data }) =>
      h.div.class(feature.layout).children(
        h.aside.class(feature.sidebar).children(
          h.p.class(feature.sidebarTitle).children(data.section.title),
          h.nav.attr('aria-label', `${data.section.title} pages`).children(
            h.ul.class(feature.nav).children(
              data.siblings.map(page =>
                h.li.key(page.href).children(
                  h.a
                    .attr('href', page.href)
                    .class(feature.navLink, page.href === data.href && feature.current)
                    .children(page.title),
                ),
              ),
            ),
          ),
        ),
        h.article.class(article.article, feature.body).children(
          Breadcrumbs(h, [
            { label: 'Home', href: homeUrl },
            { label: data.section.title, href: sectionUrl(data.section.slug) },
            { label: data.title },
          ]),
          h.h1(data.title),
          h.p.class(feature.lede).children(data.tagline),
          h.p(data.paragraphs[0] ?? ''),
          body(data),
        ),
      ),
  })
