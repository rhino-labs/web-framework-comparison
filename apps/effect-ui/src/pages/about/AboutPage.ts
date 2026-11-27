import type { Html } from '@effect/ui/html'

import { site, team } from '@bench/content'
import article from '@bench/react-ui/Article.module.css'
import teamGrid from '@bench/react-ui/TeamGrid.module.css'

import { Accordion } from '#components/Accordion'
import { ContactForm } from '#components/ContactForm'
import { Breadcrumbs, SectionTitle } from '#components/views'

import { homeUrl } from '../../routes.ts'

// The page keeps no state and loads no data, so it is a view function. Its
// accordion and form are components with their own Models.
export const AboutPage = <M>(h: Html.H<M>) =>
  h.article.class(article.article).children(
    Breadcrumbs(h, [{ label: 'Home', href: homeUrl }, { label: 'About' }]),
    h.h1('About'),
    site.about.map(text => h.p(text)),
    SectionTitle(h, 'The team'),
    h.ul.class(teamGrid.grid).children(
      team.map(member =>
        h.li
          .key(member.name)
          .class(teamGrid.member)
          .children(
            h.p.class(teamGrid.name).children(member.name),
            h.p.class(teamGrid.role).children(member.role),
            h.p.class(teamGrid.bio).children(member.bio),
          ),
      ),
    ),
    SectionTitle(h, 'Questions'),
    Accordion(h, {}),
    SectionTitle(h, 'Get in touch'),
    ContactForm(h, {}),
  )
