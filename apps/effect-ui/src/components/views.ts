import type { Html } from '@effect/ui/html'

import { formatDate } from '@bench/content'
// The same CSS modules the React frameworks use, so every framework ships
// identical styles and markup.
import article from '@bench/react-ui/Article.module.css'
import breadcrumbs from '@bench/react-ui/Breadcrumbs.module.css'
import hero from '@bench/react-ui/Hero.module.css'
import postCard from '@bench/react-ui/PostCard.module.css'
import postList from '@bench/react-ui/PostList.module.css'
import postMeta from '@bench/react-ui/PostMeta.module.css'
import sectionTitle from '@bench/react-ui/SectionTitle.module.css'
import tag from '@bench/react-ui/Tag.module.css'

import type { PostSummary } from '#domain/Content'

import { postUrl } from '../routes.ts'

// Stateless pieces are plain view functions over the caller's `h`.

export const Hero = <M>(h: Html.H<M>, title: string, tagline: string) =>
  h.section.class(hero.hero).children(h.h1(title), h.p(tagline))

export const SectionTitle = <M>(h: Html.H<M>, title: string) => h.h2.class(sectionTitle.title).children(title)

export const PostMeta = <M>(
  h: Html.H<M>,
  meta: { readonly date: string; readonly readingMinutes: number; readonly author?: string; readonly tags?: ReadonlyArray<string> },
) =>
  h.div.class(postMeta.meta).children(
    meta.author !== undefined && h.span(meta.author),
    h.time.attr('datetime', meta.date).children(formatDate(meta.date)),
    h.span(`${meta.readingMinutes} min read`),
    (meta.tags ?? []).map(name => h.span.key(name).class(tag.tag).children(name)),
  )

export const PostList = <M>(h: Html.H<M>, posts: ReadonlyArray<PostSummary>) =>
  h.ul.class(postList.list).children(
    posts.map(post =>
      h.li.key(post.slug).class(postCard.card).children(
        // Links are plain anchors; the browser Router follows the ones its
        // routes parse without a document load.
        h.h3(h.a.attr('href', postUrl(post.slug)).class(postCard.link).children(post.title)),
        PostMeta(h, { date: post.date, readingMinutes: post.readingMinutes, tags: post.tags }),
        h.p.class(postCard.excerpt).children(post.excerpt),
      ),
    ),
  )

export const Breadcrumbs = <M>(h: Html.H<M>, items: ReadonlyArray<{ readonly label: string; readonly href?: string }>) =>
  h.nav.attr('aria-label', 'Breadcrumb').children(
    h.ol.class(breadcrumbs.crumbs).children(
      items.map(item =>
        h.li.key(item.label).children(
          item.href !== undefined
            ? h.a.attr('href', item.href).class(breadcrumbs.link).children(item.label)
            : h.span.attr('aria-current', 'page').children(item.label),
        ),
      ),
    ),
  )

export const NotFound = <M>(h: Html.H<M>) => h.article.class(article.article).children(h.h1('Not found'))

/** What a lazily loaded page shows while its chunk loads, or if the load fails. */
export const PageFallback =
  <M>(h: Html.H<M>) =>
  (result: { readonly _tag: string }) =>
    h.article.class(article.article).children(result._tag === 'Failure' && h.p("Couldn't load this page. Reload to try again."))
