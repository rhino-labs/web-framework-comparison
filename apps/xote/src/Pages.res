// Page bodies, ported from packages/react-ui/src/pages.tsx.

// Breadcrumb records come from Ui; Content has fields with the same names.
@@warning("-45")

open Content
open Ui

let cls = Css.c

module HomePage = {
  @xote.component
  let make = (~data: homeData) =>
    <div>
      <Hero title={site.name} tagline={site.tagline} />
      <SectionTitle title="Latest" />
      <PostList posts={data.latest} />
      <SectionTitle title="Browse by topic" />
      <TopicTabs byTopic={data.byTopic} />
      <p> <a href="/blog"> {"All posts →"} </a> </p>
    </div>
}

module BlogPage = {
  @xote.component
  let make = (~data: blogData) =>
    <div>
      <Breadcrumbs items={[{label: "Home", href: "/"}, {label: "Blog"}]} />
      <Hero title="Blog" tagline="Every essay, newest first." />
      <Paginator pages={paginate(data.posts)} />
    </div>
}

module ArticleBody = {
  @xote.component
  let make = (~blocks: array<block>) =>
    View.fragment(
      blocks->Array.map(block =>
        switch block {
        | P({text}) => <p> {text} </p>
        | H2({id, text}) => <h2 id> {text} </h2>
        | Ul({items}) => <ul> {items->Array.map(item => <li> {item} </li>)} </ul>
        | Code({text}) => <CodeBlock code={text} />
        | Quote({text}) => <blockquote> {text} </blockquote>
        }
      ),
    )
}

module PostPage = {
  @xote.component
  let make = (~data: postData) => {
    let {post, related, comments} = data
    <article class={cls(Css.article, "article")}>
      <ReadingProgress />
      <Breadcrumbs items={[{label: "Home", href: "/"}, {label: "Blog", href: "/blog"}, {label: post.title}]} />
      <h1> {post.title} </h1>
      <PostMeta author={post.author} date={post.date} readingMinutes={post.readingMinutes} />
      <TableOfContents headings={headingsOf(post)} />
      <ArticleBody blocks={post.blocks} />
      <Callout
        title="Measure, don't guess"
        body="Every claim in this article can be reproduced with the benchmark harness in this repository."
      />
      <div class={cls(Css.article, "footer")}>
        <div class={cls(Css.article, "actions")}>
          <LikeButton />
          <ShareMenu title={post.title} path={`/blog/${post.slug}`} />
        </div>
        <PostMeta date={post.date} readingMinutes={post.readingMinutes} tags={post.tags} />
      </div>
      <AuthorBio name={post.author} />
      <SectionTitle title="Keep reading" />
      <PostList posts={related} />
      <Comments comments />
    </article>
  }
}

module AboutPage = {
  @xote.component
  let make = () =>
    <article class={cls(Css.article, "article")}>
      <Breadcrumbs items={[{label: "Home", href: "/"}, {label: "About"}]} />
      <h1> {"About"} </h1>
      {site.about->Array.map(p => <p> {p} </p>)}
      <SectionTitle title="The team" />
      <TeamGrid />
      <SectionTitle title="Questions" />
      <Accordion items={faq} />
      <SectionTitle title="Get in touch" />
      <ContactForm />
    </article>
}

module SectionPage = {
  @xote.component
  let make = (~data: sectionData) =>
    <div>
      <Breadcrumbs items={[{label: "Home", href: "/"}, {label: data.section.title}]} />
      <Hero title={data.section.title} tagline={data.section.tagline} />
      <ul class={cls(Css.feature, "cards")}>
        {data.pages->Array.map(p =>
          <li class={cls(Css.feature, "card")}>
            <a href={p.href} class={cls(Css.feature, "cardLink")}> {p.title} </a>
            <p class={cls(Css.feature, "cardText")}> {p.tagline} </p>
          </li>
        )}
      </ul>
    </div>
}

// Generated pages: the widgets come from src/generated (scripts/generate.ts).
module FeaturePage = {
  @xote.component
  let make = (~data: featureData) => {
    let paragraph = i => data.paragraphs[i]->Option.getOr("")
    <div class={cls(Css.feature, "layout")}>
      <aside class={cls(Css.feature, "sidebar")}>
        <p class={cls(Css.feature, "sidebarTitle")}> {data.section.title} </p>
        <nav ariaLabel={`${data.section.title} pages`}>
          <ul class={cls(Css.feature, "nav")}>
            {data.siblings->Array.map(p =>
              <li>
                <a
                  href={p.href}
                  class={Css.cx([cls(Css.feature, "navLink"), p.href == data.href ? cls(Css.feature, "current") : ""])}>
                  {p.title}
                </a>
              </li>
            )}
          </ul>
        </nav>
      </aside>
      <article class={Css.cx([cls(Css.article, "article"), cls(Css.feature, "body")])}>
        <Breadcrumbs
          items={[
            {label: "Home", href: "/"},
            {label: data.section.title, href: `/${data.section.slug}`},
            {label: data.title},
          ]}
        />
        <h1> {data.title} </h1>
        <p class={cls(Css.feature, "lede")}> {data.tagline} </p>
        <p> {paragraph(0)} </p>
        {PageWidgets.forPage(data.href)->Array.mapWithIndex((widget, i) =>
          View.fragment([widget, <p> {paragraph(i + 1)} </p>])
        )}
      </article>
    </div>
  }
}

module NotFoundPage = {
  @xote.component
  let make = () => <article class={cls(Css.article, "article")}> <h1> {"Not found"} </h1> </article>
}
