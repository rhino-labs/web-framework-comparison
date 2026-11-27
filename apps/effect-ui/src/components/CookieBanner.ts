import { Command, Component, UiSchema } from '@effect/ui'
import { Html } from '@effect/ui/html'
import { Effect, Schema } from 'effect'

import button from '@bench/react-ui/Button.module.css'
import cookieBanner from '@bench/react-ui/CookieBanner.module.css'

const KEY = 'cookie-consent'

const CookieBannerMessage = UiSchema.TaggedEnum({
  CompletedReadConsent: { dismissed: Schema.Boolean },
  ClickedOk: {},
})

const ReadConsent = Command.make('ReadConsent', { args: {} }, () =>
  Effect.sync(() => CookieBannerMessage.CompletedReadConsent({ dismissed: localStorage.getItem(KEY) !== null })),
)

const StoreConsent = Command.make('StoreConsent', { args: {} }, () =>
  Effect.sync(() => localStorage.setItem(KEY, '1')).pipe(Effect.as(Component.noop)),
)

export const CookieBanner = Html.component({
  name: 'CookieBanner',
  model: Schema.Struct({ dismissed: Schema.Boolean }),
  message: CookieBannerMessage,
}).make({
  // The server runs no Commands, so every page is prerendered with the
  // banner and the browser reads the stored choice once it has hydrated.
  init: $ => $.set({ dismissed: false }).run(ReadConsent.make({})),
  update: {
    CompletedReadConsent: ($, { dismissed }) => $.evolve({ dismissed }),
    ClickedOk: $ => $.evolve({ dismissed: true }).run(StoreConsent.make({})),
  },
  view: (h, model) =>
    model.dismissed
      ? h.text('')
      : h.div
          .class(cookieBanner.banner)
          .attrs({ role: 'region', 'aria-label': 'Cookie notice' })
          .children(
            h.p.class(cookieBanner.text).children('We use one cookie to remember this choice.'),
            h.button.class(button.button).on('click', CookieBannerMessage.ClickedOk()).children('OK'),
          ),
})
