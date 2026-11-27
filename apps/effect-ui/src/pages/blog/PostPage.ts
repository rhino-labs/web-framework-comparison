import { Component, Head, Mount, UiSchema } from '@effect/ui'
import { Html } from '@effect/ui/html'
import { Effect, Layer, Schema } from 'effect'
import { AsyncResult } from 'effect/reactivity'

import { site, team } from '@bench/content'
import article from '@bench/react-ui/Article.module.css'
import authorBio from '@bench/react-ui/AuthorBio.module.css'
import callout from '@bench/react-ui/Callout.module.css'
import commentsStyle from '@bench/react-ui/Comments.module.css'

import { CodeBlock } from '#components/CodeBlock'
import { LikeButton } from '#components/LikeButton'
import { ReadingProgress } from '#components/ReadingProgress'
import { ShareMenu } from '#components/ShareMenu'
import { TableOfContents } from '#components/TableOfContents'
import { Breadcrumbs, NotFound, PostList, PostMeta, SectionTitle } from '#components/views'
import type { PostData } from '#domain/Content'
import { GetPost } from '#queries/GetPost'

import { blogUrl, homeUrl, postUrl } from '../../routes.ts'
import { Content } from '../../services/Content.ts'

// Comments are below the fold: their code is a chunk of its own, loaded when
// the section scrolls into view. The `import()` is the only reference to it.
const Comments = Component.lazy('Comments', () =>
  import('../../components/Comments.ts').then(module => module.Comments),
)

const PostPageMessage = UiSchema.TaggedEnum({ CompletedWatchVisibility: {} })

// Ends the first time the element is in the viewport.
const WatchVisibility = Mount.make('WatchVisibility', { args: {} }, (node: HTMLElement) =>
  Effect.callback<void>(resume => {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect()
        resume(Effect.void)
      }
    })
    observer.observe(node)
    return Effect.sync(() => observer.disconnect())
  }),
)

const PostPageDef = Html.component({
  name: 'PostPage',
  props: Schema.Struct({ slug: Schema.String }),
  model: Schema.Struct({ commentsVisible: Schema.Boolean }),
  message: PostPageMessage,
  queries: { post: { query: GetPost, args: ({ props }) => ({ slug: props.slug }) } },
})

const AuthorBio = PostPageDef.fragment((h, name: string) =>
  h.aside.class(authorBio.bio).children(
    h.div
      .class(authorBio.avatar)
      .attr('aria-hidden', 'true')
      .children(
        name
          .split(' ')
          .map(word => word[0] ?? '')
          .join(''),
      ),
    h.div(
      h.p.class(authorBio.name).children(name),
      h.p.class(authorBio.text).children(team.find(member => member.name === name)?.bio ?? ''),
    ),
  ),
)

const Article = PostPageDef.fragment((h, commentsVisible: boolean, { comments, post, related }: PostData) => {
  const placeholder = h.p.class(commentsStyle.placeholder).children('Loading comments…')
  return h.article.class(article.article).children(
    ReadingProgress(h, {}),
    Breadcrumbs(h, [{ label: 'Home', href: homeUrl }, { label: 'Blog', href: blogUrl }, { label: post.title }]),
    h.h1(post.title),
    PostMeta(h, { author: post.author, date: post.date, readingMinutes: post.readingMinutes }),
    TableOfContents(h, {
      props: { headings: post.blocks.flatMap(block => (block.type === 'h2' ? [{ id: block.id, text: block.text }] : [])) },
    }),
    post.blocks.map((block, index) =>
      block.type === 'p'
        ? h.p.key(String(index)).children(block.text)
        : block.type === 'h2'
          ? h.h2.key(String(index)).id(block.id).children(block.text)
          : block.type === 'ul'
            ? h.ul.key(String(index)).children(block.items.map(item => h.li(item)))
            : block.type === 'code'
              ? CodeBlock(h, { key: String(index), props: { code: block.text } })
              : h.blockquote.key(String(index)).children(block.text),
    ),
    h.div
      .class(callout.callout)
      .attr('role', 'note')
      .children(
        h.p.class(callout.title).children("Measure, don't guess"),
        h.p
          .class(callout.body)
          .children('Every claim in this article can be reproduced with the benchmark harness in this repository.'),
      ),
    h.div
      .class(article.footer)
      .children(
        h.div
          .class(article.actions)
          .children(LikeButton(h, {}), ShareMenu(h, { props: { title: post.title, path: postUrl(post.slug) } })),
        PostMeta(h, { date: post.date, readingMinutes: post.readingMinutes, tags: post.tags }),
      ),
    AuthorBio(h, post.author),
    SectionTitle(h, 'Keep reading'),
    PostList(h, related),
    h.section
      .class(commentsStyle.section)
      .attr('aria-label', 'Comments')
      .onMount(WatchVisibility().pipe(Mount.map(() => PostPageMessage.CompletedWatchVisibility())))
      .children(
        h.h2(`Comments (${comments.length})`),
        commentsVisible ? Comments(h, { props: { initialComments: comments }, fallback: () => placeholder }) : placeholder,
      ),
  )
})

export const PostPageNoDeps = PostPageDef.make({
  init: () => ({ commentsVisible: false }),
  update: { CompletedWatchVisibility: $ => $.evolve({ commentsVisible: true }) },
  head: ({ queries }) => [
    Head.title(AsyncResult.isSuccess(queries.post) ? `${queries.post.value.post.title} | ${site.name}` : site.name),
  ],
  view: (h, model) =>
    AsyncResult.match(h.queries.post, {
      onInitial: () => h.article.class(article.article),
      onFailure: () => NotFound(h),
      onSuccess: ({ value }) => Article(h, model.commentsVisible, value),
    }),
})

export const PostPage = PostPageNoDeps.pipe(Component.provide(GetPost.layer.pipe(Layer.provide(Content.layerHttp))))
