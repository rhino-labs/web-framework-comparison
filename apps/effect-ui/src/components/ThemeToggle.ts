import { UiSchema } from '@effect/ui'
import { Html, HtmlHead } from '@effect/ui/html'
import { Schema } from 'effect'

import button from '@bench/react-ui/Button.module.css'

const ThemeToggleMessage = UiSchema.TaggedEnum({ ClickedToggle: {} })

// The theme is `data-theme` on <html>. The component states it in `head`
// rather than writing to the document from a Command.
export const ThemeToggle = Html.component({
  name: 'ThemeToggle',
  model: Schema.Struct({ theme: Schema.Literals(['System', 'Light', 'Dark']) }),
  message: ThemeToggleMessage,
}).make({
  init: () => ({ theme: 'System' as const }),
  update: {
    ClickedToggle: $ => $.evolve({ theme: theme => (theme === 'Dark' ? 'Light' : 'Dark') }),
  },
  head: ({ model }) =>
    model.theme === 'System' ? [] : [HtmlHead.htmlData('data-theme', model.theme === 'Dark' ? 'dark' : 'light')],
  view: (h, model) =>
    h.button
      .class(button.button)
      .attr('aria-pressed', String(model.theme === 'Dark'))
      .on('click', ThemeToggleMessage.ClickedToggle())
      .children(`${model.theme === 'Dark' ? 'Light' : 'Dark'} mode`),
})
