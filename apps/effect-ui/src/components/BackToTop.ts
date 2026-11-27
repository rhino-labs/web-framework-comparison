import { Command, Component, Subscription, UiSchema } from '@effect/ui'
import { Html } from '@effect/ui/html'
import { Effect, Schema, Stream } from 'effect'

import backToTop from '@bench/react-ui/BackToTop.module.css'
import button from '@bench/react-ui/Button.module.css'

import { onScroll } from './scroll.ts'

const BackToTopMessage = UiSchema.TaggedEnum({
  ScrolledWindow: { visible: Schema.Boolean },
  ClickedButton: {},
})

const ScrollToTop = Command.make('ScrollToTop', { args: {} }, () =>
  Effect.sync(() => window.scrollTo({ top: 0 })).pipe(Effect.as(Component.noop)),
)

export const BackToTop = Html.component({
  name: 'BackToTop',
  model: Schema.Struct({ visible: Schema.Boolean }),
  message: BackToTopMessage,
}).make({
  init: () => ({ visible: false }),
  update: {
    ScrolledWindow: ($, { visible }) => $.evolve({ visible }),
    ClickedButton: $ => $.run(ScrollToTop.make({})),
  },
  subscriptions: () => [
    Subscription.make(
      'scroll',
      onScroll(() => window.scrollY > 600).pipe(
        Stream.changes,
        Stream.map(visible => BackToTopMessage.ScrolledWindow({ visible })),
      ),
    ),
  ],
  view: (h, model) =>
    model.visible
      ? h.button.class(button.button, backToTop.button).on('click', BackToTopMessage.ClickedButton()).children('↑ Top')
      : h.text(''),
})
