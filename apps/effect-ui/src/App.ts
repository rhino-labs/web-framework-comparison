import { Router, UiSchema } from '@effect/ui'
import { Html, HtmlHead } from '@effect/ui/html'
import { Schema } from 'effect'

import { sections, site } from '@bench/content'
import footer from '@bench/react-ui/Footer.module.css'
import header from '@bench/react-ui/Header.module.css'
import shell from '@bench/react-ui/Shell.module.css'

import { BackToTop } from '#components/BackToTop'
import { CookieBanner } from '#components/CookieBanner'
import { MobileMenu } from '#components/MobileMenu'
import { NewsletterForm } from '#components/NewsletterForm'
import { SearchDialog } from '#components/SearchDialog'
import { ThemeToggle } from '#components/ThemeToggle'
import { NotFound } from '#components/views'

import { FeaturePage } from './generated/FeaturePage.ts'
import { AboutPage } from './pages/about/AboutPage.ts'
import { BlogPage } from './pages/blog/BlogPage.ts'
import { PostPage } from './pages/blog/PostPage.ts'
import { HomePage } from './pages/HomePage.ts'
import { SectionPage } from './pages/SectionPage.ts'
import { AppRoute, aboutUrl, blogUrl, homeUrl, sectionUrl } from './routes.ts'

export const AppMessage = UiSchema.TaggedEnum({ ChangedRoute: { route: AppRoute } })

// The root holds the route: the first one arrives through props and each
// later one as a message from the Router. It needs no domain Layers, since
// each page and component provides what it uses.
export const App = Html.component({
  name: 'App',
  props: Schema.Struct({ route: AppRoute }),
  model: Schema.Struct({ route: AppRoute }),
  message: AppMessage,
}).make({
  init: $ => ({ route: $.props.route }),
  update: { ChangedRoute: (_, { route }) => ({ route }) },
  subscriptions: ({ model }) => [Router.subscription(AppRoute, model.route, route => AppMessage.ChangedRoute({ route }))],
  head: () => [HtmlHead.lang('en'), HtmlHead.meta({ name: 'description', content: site.tagline })],
  view: (h, { route }) => {
    // The menu and the search dialog are keyed by the path, so following a
    // link mounts them fresh, which closes them.
    const path = AppRoute.printPath(route)
    return h.div.class(shell.shell).children(
      h.header.class(header.header).children(
        h.a.attr('href', homeUrl).class(header.brand).children(site.name),
        MobileMenu(h, { key: path }),
        SearchDialog(h, { key: path }),
        ThemeToggle(h, {}),
      ),
      h.main.class(shell.main).children(
        // Each page is keyed by its path, so a new path mounts a fresh page.
        AppRoute.match(route, {
          Home: () => HomePage(h, { key: path }),
          Blog: () => BlogPage(h, { key: path }),
          Post: ({ params }) => PostPage(h, { key: path, props: { slug: params.slug } }),
          About: () => AboutPage(h),
          Section: ({ params }) => SectionPage(h, { key: path, props: { section: params.section } }),
          Feature: () => FeaturePage(h, path),
          NotFound: () => NotFound(h),
        }),
      ),
      h.footer.class(footer.footer).children(
        h.div.class(footer.columns).children(
          NewsletterForm(h, {}),
          h.ul.class(footer.links).children(
            h.li(h.a.attr('href', blogUrl).children('Blog')),
            sections.map(section => h.li.key(section.slug).children(h.a.attr('href', sectionUrl(section.slug)).children(section.title))),
            h.li(h.a.attr('href', aboutUrl).children('About')),
          ),
        ),
        h.p.class(footer.copy).children(`© 2026 ${site.name}`),
      ),
      BackToTop(h, {}),
      CookieBanner(h, {}),
    )
  },
})
