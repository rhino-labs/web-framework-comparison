import { Array, Option } from 'effect'
import { type Document, type Html, type HtmlBuilder } from 'foldkit/html'

import { faq, formatDate, homeTopics, paginate, site, team } from '@bench/content'
// The same CSS modules the React frameworks use, so every framework ships
// identical styles and markup.
import accordion from '@bench/react-ui/Accordion.module.css'
import article from '@bench/react-ui/Article.module.css'
import authorBio from '@bench/react-ui/AuthorBio.module.css'
import backToTop from '@bench/react-ui/BackToTop.module.css'
import breadcrumbs from '@bench/react-ui/Breadcrumbs.module.css'
import button from '@bench/react-ui/Button.module.css'
import callout from '@bench/react-ui/Callout.module.css'
import codeBlock from '@bench/react-ui/CodeBlock.module.css'
import commentsStyle from '@bench/react-ui/Comments.module.css'
import contactForm from '@bench/react-ui/ContactForm.module.css'
import cookieBanner from '@bench/react-ui/CookieBanner.module.css'
import footer from '@bench/react-ui/Footer.module.css'
import header from '@bench/react-ui/Header.module.css'
import hero from '@bench/react-ui/Hero.module.css'
import mobileMenu from '@bench/react-ui/MobileMenu.module.css'
import newsletter from '@bench/react-ui/NewsletterForm.module.css'
import paginator from '@bench/react-ui/Paginator.module.css'
import postCard from '@bench/react-ui/PostCard.module.css'
import postList from '@bench/react-ui/PostList.module.css'
import postMeta from '@bench/react-ui/PostMeta.module.css'
import readingProgress from '@bench/react-ui/ReadingProgress.module.css'
import searchDialog from '@bench/react-ui/SearchDialog.module.css'
import sectionTitle from '@bench/react-ui/SectionTitle.module.css'
import shareMenu from '@bench/react-ui/ShareMenu.module.css'
import shell from '@bench/react-ui/Shell.module.css'
import tabs from '@bench/react-ui/Tabs.module.css'
import tag from '@bench/react-ui/Tag.module.css'
import teamGrid from '@bench/react-ui/TeamGrid.module.css'
import toc from '@bench/react-ui/TableOfContents.module.css'

import { type Block, type Comment, type Post, type PostSummary } from './domain'
import { type ContactField, Message, type Model } from './main'
import { AppRoute, aboutRouter, blogPostRouter, blogRouter, homeRouter } from './route'

const cx = (...classNames: ReadonlyArray<string | undefined | false>): string =>
  Array.filter(classNames, Boolean).join(' ')

// SHELL

const headerView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.header(
    [h.Class(cx(header.header))],
    [
      h.a([h.Href(homeRouter()), h.Class(cx(header.brand))], [site.name]),
      h.div(
        [h.Class(cx(mobileMenu.wrap, model.isMenuOpen && mobileMenu.open))],
        [
          h.button(
            [
              h.Class(cx(button.button, mobileMenu.toggle)),
              h.AriaExpanded(model.isMenuOpen),
              h.OnClick(Message.ClickedMenu()),
            ],
            ['Menu'],
          ),
          h.nav(
            [h.Class(cx(mobileMenu.nav))],
            [
              h.a([h.Href(blogRouter()), h.Class(cx(header.navLink))], ['Blog']),
              h.a([h.Href(aboutRouter()), h.Class(cx(header.navLink))], ['About']),
            ],
          ),
        ],
      ),
      h.button(
        [h.Class(cx(button.button)), h.OnClick(Message.ClickedSearch())],
        ['Search', h.span([h.Class(cx(searchDialog.kbd))], ['⌘K'])],
      ),
      searchView(model, h),
      h.button(
        [
          h.Class(cx(button.button)),
          h.AriaPressed(model.theme === 'Dark' ? 'true' : 'false'),
          h.OnClick(Message.ClickedToggleTheme()),
        ],
        [`${model.theme === 'Dark' ? 'Light' : 'Dark'} mode`],
      ),
    ],
  )

const searchView = (model: Model, h: HtmlBuilder<Message>): Html => {
  if (!model.isSearchOpen) {
    return h.empty
  }
  const query = model.searchQuery
  const normalized = query.trim().toLowerCase()
  const results = normalized
    ? Array.filter(model.searchItems, item => item.title.toLowerCase().includes(normalized))
    : Array.take(model.searchItems, 6)
  return h.div(
    [h.Class(cx(searchDialog.backdrop)), h.OnClick(Message.ClickedSearchBackdrop())],
    [
      h.div(
        [
          h.Class(cx(searchDialog.dialog)),
          h.Role('dialog'),
          h.AriaLabel('Search'),
          h.OnClick(Message.ClickedSearch(), { propagation: 'Stop' }),
        ],
        [
          h.input([
            h.Id('search-input'),
            h.Class(cx(searchDialog.input)),
            h.Placeholder('Search posts…'),
            h.Value(query),
            h.OnInput(value => Message.UpdatedSearchQuery({ value })),
          ]),
          Array.match(results, {
            onEmpty: () => h.p([h.Class(cx(searchDialog.empty))], [`No posts match “${query}”.`]),
            onNonEmpty: items =>
              h.ul(
                [h.Class(cx(searchDialog.results))],
                Array.map(items, item =>
                  h.keyed('li')(item.href, [], [h.a([h.Class(cx(searchDialog.result)), h.Href(item.href)], [item.title])]),
                ),
              ),
          }),
        ],
      ),
    ],
  )
}

const newsletterView = (model: Model, h: HtmlBuilder<Message>): Html =>
  model.newsletterStatus === 'Submitted'
    ? h.p([h.Class(cx(newsletter.success))], [`Thanks, ${model.newsletterEmail} is subscribed.`])
    : h.form(
        [h.Class(cx(newsletter.form)), h.Novalidate(true), h.OnSubmit(Message.SubmittedNewsletter())],
        [
          h.p([h.Class(cx(newsletter.title))], ['Get new essays by email']),
          h.div(
            [h.Class(cx(newsletter.row))],
            [
              h.input([
                h.Class(cx(newsletter.input)),
                h.Type('email'),
                h.Placeholder('you@example.com'),
                h.AriaInvalid(model.newsletterStatus === 'Invalid'),
                h.Value(model.newsletterEmail),
                h.OnInput(value => Message.UpdatedNewsletterEmail({ value })),
              ]),
              h.button([h.Class(cx(button.button, button.primary)), h.Type('submit')], ['Subscribe']),
            ],
          ),
          model.newsletterStatus === 'Invalid'
            ? h.p([h.Class(cx(newsletter.error))], ['Enter a valid email address.'])
            : h.empty,
        ],
      )

const footerView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.footer(
    [h.Class(cx(footer.footer))],
    [
      h.div(
        [h.Class(cx(footer.columns))],
        [
          newsletterView(model, h),
          h.ul(
            [h.Class(cx(footer.links))],
            [
              h.li([], [h.a([h.Href(blogRouter())], ['Blog'])]),
              h.li([], [h.a([h.Href(aboutRouter())], ['About'])]),
            ],
          ),
        ],
      ),
      h.p([h.Class(cx(footer.copy))], [`© 2026 ${site.name}`]),
    ],
  )

const backToTopView = (model: Model, h: HtmlBuilder<Message>): Html =>
  model.scrollY > 600
    ? h.button([h.Class(cx(button.button, backToTop.button)), h.OnClick(Message.ClickedBackToTop())], ['↑ Top'])
    : h.empty

const cookieBannerView = (model: Model, h: HtmlBuilder<Message>): Html =>
  model.isCookieBannerDismissed
    ? h.empty
    : h.div(
        [h.Class(cx(cookieBanner.banner)), h.Role('region'), h.AriaLabel('Cookie notice')],
        [
          h.p([h.Class(cx(cookieBanner.text))], ['We use one cookie to remember this choice.']),
          h.button([h.Class(cx(button.button)), h.OnClick(Message.ClickedDismissCookieBanner())], ['OK']),
        ],
      )

// SHARED PIECES

const heroView = (title: string, tagline: string, h: HtmlBuilder<Message>): Html =>
  h.section([h.Class(cx(hero.hero))], [h.h1([], [title]), h.p([], [tagline])])

const sectionTitleView = (title: string, h: HtmlBuilder<Message>): Html =>
  h.h2([h.Class(cx(sectionTitle.title))], [title])

const tagView = (name: string, h: HtmlBuilder<Message>): Html => h.keyed('span')(name, [h.Class(cx(tag.tag))], [name])

const postMetaView = (
  meta: { date: string; readingMinutes: number; author?: string; tags?: ReadonlyArray<string> },
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class(cx(postMeta.meta))],
    [
      meta.author ? h.span([], [meta.author]) : h.empty,
      h.time([h.Datetime(meta.date)], [formatDate(meta.date)]),
      h.span([], [`${meta.readingMinutes} min read`]),
      ...Array.map(meta.tags ?? [], name => tagView(name, h)),
    ],
  )

const postCardView = (post: PostSummary, h: HtmlBuilder<Message>): Html =>
  h.keyed('li')(
    post.slug,
    [h.Class(cx(postCard.card))],
    [
      h.h3([], [h.a([h.Href(blogPostRouter({ slug: post.slug })), h.Class(cx(postCard.link))], [post.title])]),
      postMetaView({ date: post.date, readingMinutes: post.readingMinutes, tags: post.tags }, h),
      h.p([h.Class(cx(postCard.excerpt))], [post.excerpt]),
    ],
  )

const postListView = (posts: ReadonlyArray<PostSummary>, h: HtmlBuilder<Message>): Html =>
  h.ul([h.Class(cx(postList.list))], Array.map(posts, post => postCardView(post, h)))

const breadcrumbsView = (items: ReadonlyArray<{ label: string; href?: string }>, h: HtmlBuilder<Message>): Html =>
  h.nav(
    [h.AriaLabel('Breadcrumb')],
    [
      h.ol(
        [h.Class(cx(breadcrumbs.crumbs))],
        Array.map(items, item =>
          h.keyed('li')(
            item.label,
            [],
            [
              item.href
                ? h.a([h.Href(item.href), h.Class(cx(breadcrumbs.link))], [item.label])
                : h.span([h.AriaCurrent('page')], [item.label]),
            ],
          ),
        ),
      ),
    ],
  )

// HOME

const homeView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      heroView(site.name, site.tagline, h),
      sectionTitleView('Latest', h),
      postListView(model.summaries, h),
      sectionTitleView('Browse by topic', h),
      h.div(
        [],
        [
          h.div(
            [h.Class(cx(tabs.tablist)), h.Role('tablist')],
            Array.map(homeTopics, (label, index) =>
              h.keyed('button')(
                label,
                [
                  h.Class(cx(tabs.tab)),
                  h.Role('tab'),
                  h.AriaSelected(index === model.selectedTopic),
                  h.OnClick(Message.SelectedTopic({ index })),
                ],
                [label],
              ),
            ),
          ),
          ...Array.map(model.byTopic, (posts, index) =>
            h.keyed('div')(
              homeTopics[index] ?? String(index),
              [h.Role('tabpanel'), h.Hidden(index !== model.selectedTopic)],
              [postListView(posts, h)],
            ),
          ),
        ],
      ),
      h.p([], [h.a([h.Href(blogRouter())], ['All posts →'])]),
    ],
  )

// BLOG

const blogView = (model: Model, h: HtmlBuilder<Message>): Html => {
  const pages = paginate([...model.summaries])
  return h.div(
    [],
    [
      breadcrumbsView([{ label: 'Home', href: homeRouter() }, { label: 'Blog' }], h),
      heroView('Blog', 'Every essay, newest first.', h),
      h.div(
        [],
        [
          ...Array.map(pages, (page, index) =>
            h.keyed('div')(String(index), [h.Hidden(index !== model.blogPage)], [postListView(page, h)]),
          ),
          h.nav(
            [h.Class(cx(paginator.pager)), h.AriaLabel('Pagination')],
            [
              h.button(
                [
                  h.Class(cx(button.button)),
                  h.Disabled(model.blogPage === 0),
                  h.OnClick(Message.SelectedBlogPage({ index: model.blogPage - 1 })),
                ],
                ['← Newer'],
              ),
              ...Array.map(pages, (_, index) =>
                h.keyed('button')(
                  String(index),
                  [
                    h.Class(cx(button.button, paginator.page)),
                    ...(index === model.blogPage ? [h.AriaCurrent('page')] : []),
                    h.OnClick(Message.SelectedBlogPage({ index })),
                  ],
                  [String(index + 1)],
                ),
              ),
              h.button(
                [
                  h.Class(cx(button.button)),
                  h.Disabled(model.blogPage === pages.length - 1),
                  h.OnClick(Message.SelectedBlogPage({ index: model.blogPage + 1 })),
                ],
                ['Older →'],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

// POST

const blockView = (model: Model, block: Block, h: HtmlBuilder<Message>): Html => {
  if (block.type === 'p') {
    return h.p([], [block.text])
  }
  if (block.type === 'h2') {
    return h.h2([h.Id(block.id)], [block.text])
  }
  if (block.type === 'ul') {
    return h.ul([], Array.map(block.items, item => h.li([], [item])))
  }
  if (block.type === 'code') {
    return h.div(
      [h.Class(cx(codeBlock.wrap))],
      [
        h.pre([h.Class(cx(codeBlock.pre))], [h.code([], [block.text])]),
        h.button(
          [h.Class(cx(button.button, codeBlock.copy)), h.OnClick(Message.ClickedCopyCode())],
          [model.isCodeCopied ? 'Copied' : 'Copy'],
        ),
      ],
    )
  }
  return h.blockquote([], [block.text])
}

const tableOfContentsView = (model: Model, post: Post, h: HtmlBuilder<Message>): Html =>
  h.nav(
    [h.Class(cx(toc.toc)), h.AriaLabel('On this page')],
    [
      h.p([h.Class(cx(toc.title))], ['On this page']),
      h.ol(
        [h.Class(cx(toc.list))],
        Array.flatMap(post.blocks, block =>
          block.type === 'h2'
            ? [
                h.keyed('li')(
                  block.id,
                  [],
                  [
                    h.a(
                      [
                        h.Class(
                          cx(toc.link, Option.exists(model.maybeActiveHeadingId, id => id === block.id) && toc.active),
                        ),
                        h.Href(`#${block.id}`),
                      ],
                      [block.text],
                    ),
                  ],
                ),
              ]
            : [],
        ),
      ),
    ],
  )

const shareMenuView = (model: Model, post: Post, h: HtmlBuilder<Message>): Html => {
  const url = encodeURIComponent(`https://fieldnotes.example/blog/${post.slug}`)
  return h.div(
    [h.Class(cx(shareMenu.wrap))],
    [
      h.button(
        [h.Class(cx(button.button)), h.AriaExpanded(model.isShareOpen), h.OnClick(Message.ClickedShare())],
        ['Share'],
      ),
      model.isShareOpen
        ? h.div(
            [h.Class(cx(shareMenu.menu)), h.Role('menu')],
            [
              h.button(
                [h.Class(cx(shareMenu.item)), h.Role('menuitem'), h.OnClick(Message.ClickedCopyLink())],
                [model.isLinkCopied ? 'Copied!' : 'Copy link'],
              ),
              h.a(
                [
                  h.Class(cx(shareMenu.item)),
                  h.Role('menuitem'),
                  h.Href(`https://x.com/intent/post?url=${url}&text=${encodeURIComponent(post.title)}`),
                ],
                ['Post on X'],
              ),
              h.a(
                [
                  h.Class(cx(shareMenu.item)),
                  h.Role('menuitem'),
                  h.Href(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`),
                ],
                ['Share on LinkedIn'],
              ),
            ],
          )
        : h.empty,
    ],
  )
}

const authorBioView = (name: string, h: HtmlBuilder<Message>): Html =>
  h.aside(
    [h.Class(cx(authorBio.bio))],
    [
      h.div(
        [h.Class(cx(authorBio.avatar)), h.AriaHidden(true)],
        [Array.map(name.split(' '), word => word[0] ?? '').join('')],
      ),
      h.div(
        [],
        [
          h.p([h.Class(cx(authorBio.name))], [name]),
          h.p([h.Class(cx(authorBio.text))], [team.find(member => member.name === name)?.bio ?? '']),
        ],
      ),
    ],
  )

const commentView = (comment: Comment, h: HtmlBuilder<Message>): Html =>
  h.keyed('li')(
    comment.id,
    [h.Class(cx(commentsStyle.comment))],
    [
      h.span([h.Class(cx(commentsStyle.author))], [comment.author]),
      ' · ',
      h.time([h.Datetime(comment.date)], [formatDate(comment.date)]),
      h.p([h.Class(cx(commentsStyle.body))], [comment.body]),
    ],
  )

const commentsView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.section(
    [h.Class(cx(commentsStyle.section)), h.AriaLabel('Comments')],
    [
      h.h2([], [`Comments (${model.comments.length})`]),
      ...(model.areCommentsVisible
        ? [
            h.ul([h.Class(cx(commentsStyle.list))], Array.map(model.comments, comment => commentView(comment, h))),
            h.form(
              [h.Class(cx(commentsStyle.form)), h.OnSubmit(Message.SubmittedComment())],
              [
                h.textarea([
                  h.Class(cx(commentsStyle.textarea)),
                  h.Placeholder('Add a comment'),
                  h.Value(model.commentDraft),
                  h.OnInput(value => Message.UpdatedCommentDraft({ value })),
                ]),
                h.div(
                  [],
                  [h.button([h.Class(cx(button.button, button.primary)), h.Type('submit')], ['Post comment'])],
                ),
              ],
            ),
          ]
        : [h.p([h.Class(cx(commentsStyle.placeholder))], ['Loading comments…'])]),
    ],
  )

const postView = (model: Model, post: Post, h: HtmlBuilder<Message>): Html =>
  h.article(
    [h.Class(cx(article.article))],
    [
      h.div(
        [
          h.Class(cx(readingProgress.bar)),
          h.Style({ transform: `scaleX(${model.readingProgress})` }),
          h.Role('progressbar'),
          h.AriaValuenow(Math.round(model.readingProgress * 100)),
        ],
      ),
      breadcrumbsView(
        [{ label: 'Home', href: homeRouter() }, { label: 'Blog', href: blogRouter() }, { label: post.title }],
        h,
      ),
      h.h1([], [post.title]),
      postMetaView({ author: post.author, date: post.date, readingMinutes: post.readingMinutes }, h),
      tableOfContentsView(model, post, h),
      ...Array.map(post.blocks, block => blockView(model, block, h)),
      h.div(
        [h.Class(cx(callout.callout)), h.Role('note')],
        [
          h.p([h.Class(cx(callout.title))], ["Measure, don't guess"]),
          h.p(
            [h.Class(cx(callout.body))],
            ['Every claim in this article can be reproduced with the benchmark harness in this repository.'],
          ),
        ],
      ),
      h.div(
        [h.Class(cx(article.footer))],
        [
          h.div(
            [h.Class(cx(article.actions))],
            [
              h.button(
                [
                  h.Class(cx(button.button)),
                  h.AriaPressed(model.likes > 0 ? 'true' : 'false'),
                  h.OnClick(Message.ClickedLike()),
                ],
                [`♥ ${model.likes} ${model.likes === 1 ? 'like' : 'likes'}`],
              ),
              shareMenuView(model, post, h),
            ],
          ),
          postMetaView({ date: post.date, readingMinutes: post.readingMinutes, tags: post.tags }, h),
        ],
      ),
      authorBioView(post.author, h),
      sectionTitleView('Keep reading', h),
      postListView(model.summaries, h),
      commentsView(model, h),
    ],
  )

// ABOUT

const contactFieldView = (
  model: Model,
  field: ContactField,
  label: string,
  error: string,
  h: HtmlBuilder<Message>,
): Html => {
  const attributes = [
    h.Class(cx(contactForm.input)),
    h.Value(model.contact[field]),
    h.OnInput(value => Message.UpdatedContactField({ field, value })),
  ]
  return h.label(
    [h.Class(cx(contactForm.field))],
    [
      label,
      field === 'message' ? h.textarea(attributes) : h.input(attributes),
      model.contact.errors.includes(field) ? h.span([h.Class(cx(contactForm.error))], [error]) : h.empty,
    ],
  )
}

const aboutView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.article(
    [h.Class(cx(article.article))],
    [
      breadcrumbsView([{ label: 'Home', href: homeRouter() }, { label: 'About' }], h),
      h.h1([], ['About']),
      ...Array.map(site.about, text => h.p([], [text])),
      sectionTitleView('The team', h),
      h.ul(
        [h.Class(cx(teamGrid.grid))],
        Array.map(team, member =>
          h.keyed('li')(
            member.name,
            [h.Class(cx(teamGrid.member))],
            [
              h.p([h.Class(cx(teamGrid.name))], [member.name]),
              h.p([h.Class(cx(teamGrid.role))], [member.role]),
              h.p([h.Class(cx(teamGrid.bio))], [member.bio]),
            ],
          ),
        ),
      ),
      sectionTitleView('Questions', h),
      h.div(
        [h.Class(cx(accordion.list))],
        Array.map(faq, (item, index) => {
          const isOpen = Option.exists(model.maybeOpenFaq, open => open === index)
          return h.keyed('div')(
            item.q,
            [h.Class(cx(accordion.item))],
            [
              h.button(
                [h.Class(cx(accordion.trigger)), h.AriaExpanded(isOpen), h.OnClick(Message.ClickedFaq({ index }))],
                [item.q, h.span([h.AriaHidden(true)], [isOpen ? '−' : '+'])],
              ),
              isOpen ? h.p([h.Class(cx(accordion.panel))], [item.a]) : h.empty,
            ],
          )
        }),
      ),
      sectionTitleView('Get in touch', h),
      model.contact.status === 'Submitted'
        ? h.p([h.Class(cx(contactForm.success))], [`Thanks, ${model.contact.name}. We will reply soon.`])
        : h.form(
            [h.Class(cx(contactForm.form)), h.Novalidate(true), h.OnSubmit(Message.SubmittedContact())],
            [
              contactFieldView(model, 'name', 'Name', 'Tell us your name.', h),
              contactFieldView(model, 'email', 'Email', 'Enter a valid email.', h),
              contactFieldView(model, 'message', 'Message', 'At least 10 characters, please.', h),
              h.div([], [h.button([h.Class(cx(button.button, button.primary)), h.Type('submit')], ['Send'])]),
            ],
          ),
    ],
  )

// PAGE

const notFoundView = (h: HtmlBuilder<Message>): Html =>
  h.article([h.Class(cx(article.article))], [h.h1([], ['Not found'])])

const pageView = (model: Model, h: HtmlBuilder<Message>): Html =>
  AppRoute.match(model.route, {
    Home: () => homeView(model, h),
    Blog: () => blogView(model, h),
    BlogPost: () =>
      Option.match(model.maybePost, {
        onNone: () => notFoundView(h),
        onSome: post => postView(model, post, h),
      }),
    About: () => aboutView(model, h),
    NotFound: () => notFoundView(h),
  })

const routeTitle = (model: Model): string =>
  AppRoute.match(model.route, {
    Home: () => site.name,
    Blog: () => `Blog | ${site.name}`,
    BlogPost: () =>
      Option.match(model.maybePost, {
        onNone: () => site.name,
        onSome: post => `${post.title} | ${site.name}`,
      }),
    About: () => `About | ${site.name}`,
    NotFound: () => `Not Found | ${site.name}`,
  })

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: routeTitle(model),
  body: h.div(
    [h.Class(cx(shell.shell))],
    [
      headerView(model, h),
      h.main([h.Class(cx(shell.main))], [pageView(model, h)]),
      footerView(model, h),
      backToTopView(model, h),
      cookieBannerView(model, h),
    ],
  ),
})
