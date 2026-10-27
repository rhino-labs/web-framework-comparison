// The shared components, ported from packages/react-ui with the same markup
// and CSS module classes. Interactive state lives in signals; window
// listeners are effects, which only run in the browser (after hydration).

open Content

let cls = Css.c

// STATIC

module Hero = {
  @xote.component
  let make = (~title: string, ~tagline: string) =>
    <section class={cls(Css.hero, "hero")}>
      <h1> {title} </h1>
      <p> {tagline} </p>
    </section>
}

module SectionTitle = {
  @xote.component
  let make = (~title: string) => <h2 class={cls(Css.sectionTitle, "title")}> {title} </h2>
}

module PostMeta = {
  @xote.component
  let make = (~date: string, ~readingMinutes: int, ~author: option<string>=?, ~tags: array<string>=[]) =>
    <div class={cls(Css.postMeta, "meta")}>
      // An empty array, not View.null(): a static empty text node has no
      // server markup to hydrate against.
      {author->Option.mapOr([], name => [<span> {name} </span>])}
      <time attrs={[("datetime", date)]}> {formatDate(date)} </time>
      <span> {`${readingMinutes->Int.toString} min read`} </span>
      {tags->Array.map(name => <span class={cls(Css.tag, "tag")}> {name} </span>)}
    </div>
}

module PostList = {
  @xote.component
  let make = (~posts: array<postSummary>) =>
    <ul class={cls(Css.postList, "list")}>
      {posts->Array.map(post =>
        <li class={cls(Css.postCard, "card")}>
          <h3>
            <a href={`/blog/${post.slug}`} class={cls(Css.postCard, "link")}> {post.title} </a>
          </h3>
          <PostMeta date={post.date} readingMinutes={post.readingMinutes} tags={post.tags} />
          <p class={cls(Css.postCard, "excerpt")}> {post.excerpt} </p>
        </li>
      )}
    </ul>
}

type crumb = {label: string, href?: string}

module Breadcrumbs = {
  @xote.component
  let make = (~items: array<crumb>) =>
    <nav ariaLabel="Breadcrumb">
      <ol class={cls(Css.breadcrumbs, "crumbs")}>
        {items->Array.map(item =>
          <li>
            {switch item.href {
            | Some(href) => <a href class={cls(Css.breadcrumbs, "link")}> {item.label} </a>
            | None => <span attrs={[("aria-current", "page")]}> {item.label} </span>
            }}
          </li>
        )}
      </ol>
    </nav>
}

module AuthorBio = {
  @xote.component
  let make = (~name: string) => {
    let initials = name->String.split(" ")->Array.map(w => w->String.charAt(0))->Array.join("")
    let bio = team->Array.find(m => m.name == name)->Option.map(m => m.bio)->Option.getOr("")
    <aside class={cls(Css.authorBio, "bio")}>
      <div class={cls(Css.authorBio, "avatar")} ariaHidden="true"> {initials} </div>
      <div>
        <p class={cls(Css.authorBio, "name")}> {name} </p>
        <p class={cls(Css.authorBio, "text")}> {bio} </p>
      </div>
    </aside>
  }
}

module Callout = {
  @xote.component
  let make = (~title: string, ~body: string) =>
    <div class={cls(Css.callout, "callout")} role="note">
      <p class={cls(Css.callout, "title")}> {title} </p>
      <p class={cls(Css.callout, "body")}> {body} </p>
    </div>
}

module TeamGrid = {
  @xote.component
  let make = () =>
    <ul class={cls(Css.teamGrid, "grid")}>
      {team->Array.map(m =>
        <li class={cls(Css.teamGrid, "member")}>
          <p class={cls(Css.teamGrid, "name")}> {m.name} </p>
          <p class={cls(Css.teamGrid, "role")}> {m.role} </p>
          <p class={cls(Css.teamGrid, "bio")}> {m.bio} </p>
        </li>
      )}
    </ul>
}

// INTERACTIVE
//
// A conditional that renders nothing at first is written as an explicit
// `{View.tracked(() => ...)}`. The PPX's automatic wrapping of a bare `if` did
// not re-render such a block after hydration in Xote 7.1.0.

let pressed = (value: unit => bool) => () => value() ? "true" : "false"

module ThemeToggle = {
  @xote.component
  let make = () => {
    let dark = Signal.make(false)
    <button
      class={cls(Css.button, "button")}
      attrs={[("aria-pressed", pressed(() => Signal.get(dark)))]}
      onClick={_ => {
        let next = !Signal.peek(dark)
        Signal.set(dark, next)
        Browser.setTheme(next)
      }}>
      {(Signal.get(dark) ? "Light" : "Dark") ++ " mode"}
    </button>
  }
}

module SearchDialog = {
  @xote.component
  let make = (~items: array<searchItem>) => {
    let isOpen = Signal.make(false)
    let query = Signal.make("")
    let openSearch = () => {
      Signal.set(isOpen, true)
      Browser.focusById("search-input")
    }
    Browser.clientEffect(() =>
      Browser.onWindow("keydown", event =>
        switch Browser.searchKey(event) {
        | #Toggle => Signal.peek(isOpen) ? Signal.set(isOpen, false) : openSearch()
        | #Close => Signal.set(isOpen, false)
        | #None => ()
        }
      )
    )
    let results = () => {
      let q = Signal.get(query)->String.trim->String.toLowerCase
      q == ""
        ? items->Array.slice(~start=0, ~end=6)
        : items->Array.filter(item => item.title->String.toLowerCase->String.includes(q))
    }
    View.fragment([
      <button class={cls(Css.button, "button")} onClick={_ => openSearch()}>
        {"Search"}
        <span class={cls(Css.searchDialog, "kbd")}> {"⌘K"} </span>
      </button>,
      View.tracked(() =>
        Signal.get(isOpen)
          ? <div class={cls(Css.searchDialog, "backdrop")} onClick={_ => Signal.set(isOpen, false)}>
              <div
                class={cls(Css.searchDialog, "dialog")}
                role="dialog"
                ariaLabel="Search"
                onClick={Browser.stopPropagation}>
                <input
                  id="search-input"
                  class={cls(Css.searchDialog, "input")}
                  placeholder="Search posts…"
                  value={() => Signal.get(query)}
                  onInput={event => Signal.set(query, Browser.targetValue(event))}
                />
                {View.tracked(() =>
                  results()->Array.length > 0
                    ? <ul class={cls(Css.searchDialog, "results")}>
                        {results()->Array.map(item =>
                          <li>
                            <a class={cls(Css.searchDialog, "result")} href={item.href}> {item.title} </a>
                          </li>
                        )}
                      </ul>
                    : <p class={cls(Css.searchDialog, "empty")}>
                        {`No posts match “${Signal.peek(query)}”.`}
                      </p>
                )}
              </div>
            </div>
          : View.fragment([])
      ),
    ])
  }
}

type submitStatus = Idle | Invalid | Subscribed

module NewsletterForm = {
  @xote.component
  let make = () => {
    let email = Signal.make("")
    let status = Signal.make(Idle)
    View.tracked(() =>
      Signal.get(status) == Subscribed
        ? <p class={cls(Css.newsletter, "success")}> {`Thanks, ${Signal.peek(email)} is subscribed.`} </p>
        : <form
            class={cls(Css.newsletter, "form")}
            attrs={[("novalidate", "")]}
            onSubmit={event => {
              Browser.preventDefault(event)
              Signal.set(status, Browser.isEmail(Signal.peek(email)) ? Subscribed : Invalid)
            }}>
            <p class={cls(Css.newsletter, "title")}> {"Get new essays by email"} </p>
            <div class={cls(Css.newsletter, "row")}>
              <input
                class={cls(Css.newsletter, "input")}
                type_="email"
                placeholder="you@example.com"
                attrs={[("aria-invalid", pressed(() => Signal.get(status) == Invalid))]}
                value={() => Signal.get(email)}
                onInput={event => {
                  Signal.set(email, Browser.targetValue(event))
                  Signal.set(status, Idle)
                }}
              />
              <button class={Css.cx([cls(Css.button, "button"), cls(Css.button, "primary")])} type_="submit">
                {"Subscribe"}
              </button>
            </div>
            {Signal.get(status) == Invalid
              ? <p class={cls(Css.newsletter, "error")}> {"Enter a valid email address."} </p>
              : View.fragment([])}
          </form>
    )
  }
}

module BackToTop = {
  @xote.component
  let make = () => {
    let visible = Signal.make(false)
    Browser.clientEffect(() => Browser.onWindow("scroll", _ => Signal.set(visible, Browser.scrollY() > 600.)))
    View.tracked(() =>
      Signal.get(visible)
        ? <button
            class={Css.cx([cls(Css.button, "button"), cls(Css.backToTop, "button")])}
            onClick={_ => Browser.scrollToTop()}>
            {"↑ Top"}
          </button>
        : View.fragment([])
    )
  }
}

module CookieBanner = {
  @xote.component
  let make = () => {
    let dismissed = Signal.make(false)
    Browser.clientEffect(() => {
      if Browser.getStorage("cookie-consent")->Option.isSome {
        Signal.set(dismissed, true)
      }
      None
    })
    View.tracked(() =>
      Signal.get(dismissed)
        ? View.fragment([])
        : <div class={cls(Css.cookieBanner, "banner")} role="region" ariaLabel="Cookie notice">
            <p class={cls(Css.cookieBanner, "text")}> {"We use one cookie to remember this choice."} </p>
            <button
              class={cls(Css.button, "button")}
              onClick={_ => {
                Browser.setStorage("cookie-consent", "1")
                Signal.set(dismissed, true)
              }}>
              {"OK"}
            </button>
          </div>
    )
  }
}

module TopicTabs = {
  @xote.component
  let make = (~byTopic: array<array<postSummary>>) => {
    let selected = Signal.make(0)
    <div>
      <div class={cls(Css.tabs, "tablist")} role="tablist">
        {homeTopics->Array.mapWithIndex((label, i) =>
          <button
            class={cls(Css.tabs, "tab")}
            role="tab"
            ariaSelected={() => Signal.get(selected) == i}
            onClick={_ => Signal.set(selected, i)}>
            {label}
          </button>
        )}
      </div>
      {byTopic->Array.mapWithIndex((posts, i) =>
        <div role="tabpanel" hidden={() => Signal.get(selected) != i}> <PostList posts /> </div>
      )}
    </div>
  }
}

module Paginator = {
  @xote.component
  let make = (~pages: array<array<postSummary>>) => {
    let page = Signal.make(0)
    let last = pages->Array.length - 1
    let button = cls(Css.button, "button")
    <div>
      {pages->Array.mapWithIndex((posts, i) =>
        <div hidden={() => Signal.get(page) != i}> <PostList posts /> </div>
      )}
      <nav class={cls(Css.paginator, "pager")} ariaLabel="Pagination">
        <button class={button} disabled={() => Signal.get(page) == 0} onClick={_ => Signal.update(page, p => p - 1)}>
          {"← Newer"}
        </button>
        {pages->Array.mapWithIndex((_, i) => {
          let (_, current) = View.optionalComputedAttr("aria-current", () =>
            Signal.get(page) == i ? Some("page") : None
          )
          <button
            class={Css.cx([button, cls(Css.paginator, "page")])}
            attrs={[("aria-current", current)]}
            onClick={_ => Signal.set(page, i)}>
            {(i + 1)->Int.toString}
          </button>
        })}
        <button class={button} disabled={() => Signal.get(page) == last} onClick={_ => Signal.update(page, p => p + 1)}>
          {"Older →"}
        </button>
      </nav>
    </div>
  }
}

module Accordion = {
  @xote.component
  let make = (~items: array<faqItem>) => {
    let openIndex = Signal.make(0)
    <div class={cls(Css.accordion, "list")}>
      {items->Array.mapWithIndex((item, i) =>
        <div class={cls(Css.accordion, "item")}>
          <button
            class={cls(Css.accordion, "trigger")}
            ariaExpanded={() => Signal.get(openIndex) == i}
            onClick={_ => Signal.update(openIndex, current => current == i ? -1 : i)}>
            {item.q}
            <span ariaHidden="true"> {Signal.get(openIndex) == i ? "−" : "+"} </span>
          </button>
          {View.tracked(() =>
            Signal.get(openIndex) == i ? <p class={cls(Css.accordion, "panel")}> {item.a} </p> : View.fragment([])
          )}
        </div>
      )}
    </div>
  }
}

type contactField = Name | Email | Message

module ContactForm = {
  @xote.component
  let make = () => {
    let name = Signal.make("")
    let email = Signal.make("")
    let message = Signal.make("")
    let errors = Signal.make([])
    let sent = Signal.make(false)
    let field = (key, label, value, hint, multiline) => {
      let onInput = event => Signal.set(value, Browser.targetValue(event))
      <label class={cls(Css.contactForm, "field")}>
        {label}
        {multiline
          ? <textarea class={cls(Css.contactForm, "input")} value={() => Signal.get(value)} onInput />
          : <input class={cls(Css.contactForm, "input")} value={() => Signal.get(value)} onInput />}
        {View.tracked(() =>
          Signal.get(errors)->Array.includes(key)
            ? <span class={cls(Css.contactForm, "error")}> {hint} </span>
            : View.fragment([])
        )}
      </label>
    }
    View.tracked(() =>
      Signal.get(sent)
        ? <p class={cls(Css.contactForm, "success")}> {`Thanks, ${Signal.peek(name)}. We will reply soon.`} </p>
        : <form
            class={cls(Css.contactForm, "form")}
            attrs={[("novalidate", "")]}
            onSubmit={event => {
              Browser.preventDefault(event)
              let next = [
                Signal.peek(name)->String.trim == "" ? Some(Name) : None,
                Browser.isEmail(Signal.peek(email)) ? None : Some(Email),
                Signal.peek(message)->String.trim->String.length >= 10 ? None : Some(Message),
              ]->Array.filterMap(x => x)
              Signal.set(errors, next)
              if next->Array.length == 0 {
                Signal.set(sent, true)
              }
            }}>
            {field(Name, "Name", name, "Tell us your name.", false)}
            {field(Email, "Email", email, "Enter a valid email.", false)}
            {field(Message, "Message", message, "At least 10 characters, please.", true)}
            <div>
              <button class={Css.cx([cls(Css.button, "button"), cls(Css.button, "primary")])} type_="submit">
                {"Send"}
              </button>
            </div>
          </form>
    )
  }
}

module CodeBlock = {
  @xote.component
  let make = (~code: string) => {
    let copied = Signal.make(false)
    <div class={cls(Css.codeBlock, "wrap")}>
      <pre class={cls(Css.codeBlock, "pre")}>
        <code> {code} </code>
      </pre>
      <button
        class={Css.cx([cls(Css.button, "button"), cls(Css.codeBlock, "copy")])}
        onClick={_ => Browser.copyText(code)->Promise.thenResolve(() => Signal.set(copied, true))->ignore}>
        {Signal.get(copied) ? "Copied" : "Copy"}
      </button>
    </div>
  }
}

module LikeButton = {
  @xote.component
  let make = () => {
    let likes = Signal.make(0)
    <button
      class={cls(Css.button, "button")}
      attrs={[("aria-pressed", pressed(() => Signal.get(likes) > 0))]}
      onClick={_ => Signal.update(likes, n => n + 1)}>
      {`♥ ${Signal.get(likes)->Int.toString} ${Signal.get(likes) == 1 ? "like" : "likes"}`}
    </button>
  }
}

@val external encodeURIComponent: string => string = "encodeURIComponent"

module ShareMenu = {
  @xote.component
  let make = (~title: string, ~path: string) => {
    let isOpen = Signal.make(false)
    let copied = Signal.make(false)
    let url = encodeURIComponent(`https://fieldnotes.example${path}`)
    let item = cls(Css.shareMenu, "item")
    <div class={cls(Css.shareMenu, "wrap")}>
      <button class={cls(Css.button, "button")} ariaExpanded={() => Signal.get(isOpen)} onClick={_ => Signal.update(isOpen, v => !v)}>
        {"Share"}
      </button>
      {View.tracked(() =>
        Signal.get(isOpen)
          ? <div class={cls(Css.shareMenu, "menu")} role="menu">
              <button
                class={item}
                role="menuitem"
                onClick={_ => Browser.copyText(Browser.locationHref())->Promise.thenResolve(() => Signal.set(copied, true))->ignore}>
                {Signal.get(copied) ? "Copied!" : "Copy link"}
              </button>
              <a class={item} role="menuitem" href={`https://x.com/intent/post?url=${url}&text=${encodeURIComponent(title)}`}>
                {"Post on X"}
              </a>
              <a class={item} role="menuitem" href={`https://www.linkedin.com/sharing/share-offsite/?url=${url}`}>
                {"Share on LinkedIn"}
              </a>
            </div>
          : View.fragment([])
      )}
    </div>
  }
}

module TableOfContents = {
  @xote.component
  let make = (~headings: array<heading>) => {
    let active = Signal.make(None)
    Browser.clientEffect(() =>
      Browser.observeHeadings(headings->Array.map(h => h.id), id => Signal.set(active, Some(id)))
    )
    <nav class={cls(Css.toc, "toc")} ariaLabel="On this page">
      <p class={cls(Css.toc, "title")}> {"On this page"} </p>
      <ol class={cls(Css.toc, "list")}>
        {headings->Array.map(h =>
          <li>
            <a
              class={() => Css.cx([cls(Css.toc, "link"), Signal.get(active) == Some(h.id) ? cls(Css.toc, "active") : ""])}
              href={`#${h.id}`}>
              {h.text}
            </a>
          </li>
        )}
      </ol>
    </nav>
  }
}

module ReadingProgress = {
  @xote.component
  let make = () => {
    let progress = Signal.make(0.)
    Browser.clientEffect(() => {
      Signal.set(progress, Browser.scrollProgress())
      Browser.onWindow("scroll", _ => Signal.set(progress, Browser.scrollProgress()))
    })
    <div
      class={cls(Css.readingProgress, "bar")}
      style={() => `transform:scaleX(${Signal.get(progress)->Float.toString})`}
      role="progressbar"
      attrs={[("aria-valuenow", () => Math.round(Signal.get(progress) *. 100.)->Float.toString)]}
    />
  }
}

// Comments render once the section scrolls into view. Xote has no lazy
// component loading here, so their code is in the main bundle (as in Foldkit).
module Comments = {
  @xote.component
  let make = (~comments: array<comment>) => {
    let visible = Signal.make(false)
    let list = Signal.make(comments)
    let draft = Signal.make("")
    Browser.clientEffect(() => Browser.onVisible(`section[aria-label="Comments"]`, () => Signal.set(visible, true)))
    let placeholder = <p class={cls(Css.comments, "placeholder")}> {"Loading comments…"} </p>
    <section class={cls(Css.comments, "section")} ariaLabel="Comments">
      <h2> {`Comments (${comments->Array.length->Int.toString})`} </h2>
      {Signal.get(visible)
        ? View.fragment([
            <ul class={cls(Css.comments, "list")}>
              <View.For
                each={MaybeSignal.reactive(list)}
                by={c => c.id}
                render={c =>
                  <li class={cls(Css.comments, "comment")}>
                    <span class={cls(Css.comments, "author")}> {c.author} </span>
                    {" · "}
                    <time attrs={[("datetime", c.date)]}> {formatDate(c.date)} </time>
                    <p class={cls(Css.comments, "body")}> {c.body} </p>
                  </li>}
              />
            </ul>,
            <form
              class={cls(Css.comments, "form")}
              onSubmit={event => {
                Browser.preventDefault(event)
                let body = Signal.peek(draft)
                if body->String.trim != "" {
                  Signal.update(list, l =>
                    l->Array.concat([
                      {id: `new-${l->Array.length->Int.toString}`, author: "you", date: Browser.today(), body},
                    ])
                  )
                  Signal.set(draft, "")
                }
              }}>
              <textarea
                class={cls(Css.comments, "textarea")}
                placeholder="Add a comment"
                value={() => Signal.get(draft)}
                onInput={event => Signal.set(draft, Browser.targetValue(event))}
              />
              <div>
                <button class={Css.cx([cls(Css.button, "button"), cls(Css.button, "primary")])} type_="submit">
                  {"Post comment"}
                </button>
              </div>
            </form>,
          ])
        : placeholder}
    </section>
  }
}

// SHELL

module Shell = {
  @xote.component
  let make = (~searchItems: array<searchItem>, ~children: View.node) => {
    let menuOpen = Signal.make(false)
    let navLink = cls(Css.header, "navLink")
    <div class={cls(Css.shell, "shell")}>
      <header class={cls(Css.header, "header")}>
        <a href="/" class={cls(Css.header, "brand")}> {site.name} </a>
        <div
          class={() =>
            Css.cx([cls(Css.mobileMenu, "wrap"), Signal.get(menuOpen) ? cls(Css.mobileMenu, "open") : ""])}>
          <button
            class={Css.cx([cls(Css.button, "button"), cls(Css.mobileMenu, "toggle")])}
            ariaExpanded={() => Signal.get(menuOpen)}
            onClick={_ => Signal.update(menuOpen, v => !v)}>
            {"Menu"}
          </button>
          <nav class={cls(Css.mobileMenu, "nav")}>
            <a href="/blog" class={navLink}> {"Blog"} </a>
            {sections->Array.map(s => <a href={`/${s.slug}`} class={navLink}> {s.title} </a>)}
            <a href="/about" class={navLink}> {"About"} </a>
          </nav>
        </div>
        <SearchDialog items={searchItems} />
        <ThemeToggle />
      </header>
      <main class={cls(Css.shell, "main")}> {children} </main>
      <footer class={cls(Css.footer, "footer")}>
        <div class={cls(Css.footer, "columns")}>
          <NewsletterForm />
          <ul class={cls(Css.footer, "links")}>
            <li> <a href="/blog"> {"Blog"} </a> </li>
            {sections->Array.map(s => <li> <a href={`/${s.slug}`}> {s.title} </a> </li>)}
            <li> <a href="/about"> {"About"} </a> </li>
          </ul>
        </div>
        <p class={cls(Css.footer, "copy")}> {`© 2026 ${site.name}`} </p>
      </footer>
      <BackToTop />
      <CookieBanner />
    </div>
  }
}
