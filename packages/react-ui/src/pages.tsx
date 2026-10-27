import { Fragment, type ReactNode } from 'react'
import {
  faq,
  headingsOf,
  homeTopics,
  paginate,
  site,
  type BlogData,
  type FeatureData,
  type HomeData,
  type PostData,
  type SectionData,
} from '@bench/content'
import type { LinkComponent } from './types'
import { Hero } from './Hero'
import { SectionTitle } from './SectionTitle'
import { PostList } from './PostList'
import { PostMeta } from './PostMeta'
import { Breadcrumbs } from './Breadcrumbs'
import { AuthorBio } from './AuthorBio'
import { Callout } from './Callout'
import { TeamGrid } from './TeamGrid'
import { ArticleBody } from './ArticleBody'
import { Tabs } from './Tabs'
import { Paginator } from './Paginator'
import { Accordion } from './Accordion'
import { ContactForm } from './ContactForm'
import { LikeButton } from './LikeButton'
import { ShareMenu } from './ShareMenu'
import { TableOfContents } from './TableOfContents'
import { ReadingProgress } from './ReadingProgress'
import { LazyComments } from './LazyComments'
import a from './Article.module.css'
import f from './FeatureLayout.module.css'

// Page bodies are shared by every React framework; each framework's route
// only loads data (on the server, from @bench/content/server) and passes its
// own Link.

export function HomePage({ data, Link }: { data: HomeData; Link: LinkComponent }) {
  return (
    <>
      <Hero title={site.name} tagline={site.tagline} />
      <SectionTitle>Latest</SectionTitle>
      <PostList posts={data.latest} Link={Link} />
      <SectionTitle>Browse by topic</SectionTitle>
      <Tabs labels={homeTopics}>
        {data.byTopic.map((posts, i) => (
          <PostList key={homeTopics[i]} posts={posts} Link={Link} />
        ))}
      </Tabs>
      <p>
        <Link href="/blog">All posts →</Link>
      </p>
    </>
  )
}

export function BlogPage({ data, Link }: { data: BlogData; Link: LinkComponent }) {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Blog' }]} Link={Link} />
      <Hero title="Blog" tagline="Every essay, newest first." />
      <Paginator>
        {paginate(data.posts).map((page, i) => (
          <PostList key={i} posts={page} Link={Link} />
        ))}
      </Paginator>
    </>
  )
}

export function PostPage({ data: { post, related, comments }, Link }: { data: PostData; Link: LinkComponent }) {
  return (
    <article className={a.article}>
      <ReadingProgress />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Blog', href: '/blog' }, { label: post.title }]} Link={Link} />
      <h1>{post.title}</h1>
      <PostMeta author={post.author} date={post.date} readingMinutes={post.readingMinutes} />
      <TableOfContents headings={headingsOf(post)} />
      <ArticleBody blocks={post.blocks} />
      <Callout title="Measure, don't guess">Every claim in this article can be reproduced with the benchmark harness in this repository.</Callout>
      <div className={a.footer}>
        <div className={a.actions}>
          <LikeButton />
          <ShareMenu title={post.title} path={`/blog/${post.slug}`} />
        </div>
        <PostMeta date={post.date} readingMinutes={post.readingMinutes} tags={post.tags} />
      </div>
      <AuthorBio name={post.author} />
      <SectionTitle>Keep reading</SectionTitle>
      <PostList posts={related} Link={Link} />
      <LazyComments comments={comments} />
    </article>
  )
}

export function AboutPage({ Link }: { Link: LinkComponent }) {
  return (
    <article className={a.article}>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'About' }]} Link={Link} />
      <h1>About</h1>
      {site.about.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      <SectionTitle>The team</SectionTitle>
      <TeamGrid />
      <SectionTitle>Questions</SectionTitle>
      <Accordion items={faq} />
      <SectionTitle>Get in touch</SectionTitle>
      <ContactForm />
    </article>
  )
}

export function SectionPage({ data: { section, pages }, Link }: { data: SectionData; Link: LinkComponent }) {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: section.title }]} Link={Link} />
      <Hero title={section.title} tagline={section.tagline} />
      <ul className={f.cards}>
        {pages.map(p => (
          <li key={p.href} className={f.card}>
            <Link href={p.href} className={f.cardLink}>{p.title}</Link>
            <p className={f.cardText}>{p.tagline}</p>
          </li>
        ))}
      </ul>
    </>
  )
}

/** Layout for generated pages. Each generated page passes its own widgets as
 * children; a paragraph of copy follows each one. */
export function FeatureLayout({ data, Link, children }: { data: FeatureData; Link: LinkComponent; children: ReactNode }) {
  const [intro, ...rest] = data.paragraphs
  return (
    <div className={f.layout}>
      <aside className={f.sidebar}>
        <p className={f.sidebarTitle}>{data.section.title}</p>
        <nav aria-label={`${data.section.title} pages`}>
          <ul className={f.nav}>
            {data.siblings.map(p => (
              <li key={p.href}>
                <Link href={p.href} className={p.href === data.href ? `${f.navLink} ${f.current}` : f.navLink}>{p.title}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <article className={`${a.article} ${f.body}`}>
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: data.section.title, href: `/${data.section.slug}` }, { label: data.title }]} Link={Link} />
        <h1>{data.title}</h1>
        <p className={f.lede}>{data.tagline}</p>
        <p>{intro}</p>
        {Array.isArray(children)
          ? children.map((widget, i) => (
              <Fragment key={i}>
                {widget}
                <p>{rest[i]}</p>
              </Fragment>
            ))
          : children}
      </article>
    </div>
  )
}
