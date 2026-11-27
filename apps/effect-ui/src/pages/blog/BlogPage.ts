import { Component, Head, UiSchema } from '@effect/ui'
import { Html } from '@effect/ui/html'
import { Layer, Schema } from 'effect'
import { AsyncResult } from 'effect/reactivity'

import { paginate, site } from '@bench/content'
import button from '@bench/react-ui/Button.module.css'
import paginator from '@bench/react-ui/Paginator.module.css'

import { Breadcrumbs, Hero, PostList } from '#components/views'
import { GetBlog } from '#queries/GetBlog'

import { homeUrl } from '../../routes.ts'
import { Content } from '../../services/Content.ts'

const BlogPageMessage = UiSchema.TaggedEnum({ ClickedPage: { index: Schema.Number } })

export const BlogPageNoDeps = Html.component({
  name: 'BlogPage',
  model: Schema.Struct({ page: Schema.Number }),
  message: BlogPageMessage,
  queries: { blog: { query: GetBlog, args: () => ({}) } },
}).make({
  init: () => ({ page: 0 }),
  update: { ClickedPage: ($, { index }) => $.evolve({ page: index }) },
  head: () => [Head.title(`Blog | ${site.name}`)],
  view: (h, model) => {
    const pages = AsyncResult.isSuccess(h.queries.blog) ? paginate([...h.queries.blog.value.posts]) : []
    return h.div(
      Breadcrumbs(h, [{ label: 'Home', href: homeUrl }, { label: 'Blog' }]),
      Hero(h, 'Blog', 'Every essay, newest first.'),
      h.div(
        pages.map((page, index) =>
          h.div
            .key(String(index))
            .attr('hidden', index === model.page ? undefined : '')
            .children(PostList(h, page)),
        ),
        h.nav
          .class(paginator.pager)
          .attr('aria-label', 'Pagination')
          .children(
            h.button
              .class(button.button)
              .disabled(model.page === 0)
              .on('click', BlogPageMessage.ClickedPage({ index: model.page - 1 }))
              .children('← Newer'),
            pages.map((_, index) =>
              h.button
                .key(String(index))
                .class(button.button, paginator.page)
                .attr('aria-current', index === model.page ? 'page' : undefined)
                .on('click', BlogPageMessage.ClickedPage({ index }))
                .children(String(index + 1)),
            ),
            h.button
              .class(button.button)
              .disabled(model.page === pages.length - 1)
              .on('click', BlogPageMessage.ClickedPage({ index: model.page + 1 }))
              .children('Older →'),
          ),
      ),
    )
  },
})

export const BlogPage = BlogPageNoDeps.pipe(Component.provide(GetBlog.layer.pipe(Layer.provide(Content.layerHttp))))
