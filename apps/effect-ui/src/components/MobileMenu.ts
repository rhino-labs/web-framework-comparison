import { UiSchema } from '@effect/ui'
import { Html } from '@effect/ui/html'
import { Schema } from 'effect'

import { sections } from '@bench/content'
import button from '@bench/react-ui/Button.module.css'
import header from '@bench/react-ui/Header.module.css'
import mobileMenu from '@bench/react-ui/MobileMenu.module.css'

import { aboutUrl, blogUrl, sectionUrl } from '../routes.ts'

const MobileMenuMessage = UiSchema.TaggedEnum({ ClickedToggle: {} })

export const MobileMenu = Html.component({
  name: 'MobileMenu',
  model: Schema.Struct({ open: Schema.Boolean }),
  message: MobileMenuMessage,
}).make({
  init: () => ({ open: false }),
  update: { ClickedToggle: $ => $.evolve({ open: open => !open }) },
  view: (h, model) =>
    h.div.class(mobileMenu.wrap, model.open && mobileMenu.open).children(
      h.button
        .class(button.button, mobileMenu.toggle)
        .attr('aria-expanded', String(model.open))
        .on('click', MobileMenuMessage.ClickedToggle())
        .children('Menu'),
      h.nav.class(mobileMenu.nav).children(
        h.a.attr('href', blogUrl).class(header.navLink).children('Blog'),
        sections.map(section =>
          h.a.key(section.slug).attr('href', sectionUrl(section.slug)).class(header.navLink).children(section.title),
        ),
        h.a.attr('href', aboutUrl).class(header.navLink).children('About'),
      ),
    ),
})
