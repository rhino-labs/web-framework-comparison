import { Command, UiSchema } from '@effect/ui'
import { Html } from '@effect/ui/html'
import { Effect, Schema } from 'effect'

import button from '@bench/react-ui/Button.module.css'
import shareMenu from '@bench/react-ui/ShareMenu.module.css'

import { copyText } from './clipboard.ts'

const ShareMenuMessage = UiSchema.TaggedEnum({
  ClickedShare: {},
  ClickedCopyLink: {},
  CompletedCopyLink: {},
})

const CopyLink = Command.make('CopyLink', { args: {} }, () =>
  copyText(() => location.href).pipe(Effect.as(ShareMenuMessage.CompletedCopyLink())),
)

export const ShareMenu = Html.component({
  name: 'ShareMenu',
  props: Schema.Struct({ title: Schema.String, path: Schema.String }),
  model: Schema.Struct({ open: Schema.Boolean, copied: Schema.Boolean }),
  message: ShareMenuMessage,
}).make({
  init: () => ({ open: false, copied: false }),
  update: {
    ClickedShare: $ => $.evolve({ open: open => !open }),
    ClickedCopyLink: $ => $.run(CopyLink.make({})),
    CompletedCopyLink: $ => $.evolve({ copied: true }),
  },
  view: (h, model) => {
    const url = encodeURIComponent(`https://fieldnotes.example${h.props.path}`)
    return h.div.class(shareMenu.wrap).children(
      h.button
        .class(button.button)
        .attr('aria-expanded', String(model.open))
        .on('click', ShareMenuMessage.ClickedShare())
        .children('Share'),
      model.open &&
        h.div
          .class(shareMenu.menu)
          .attr('role', 'menu')
          .children(
            h.button
              .class(shareMenu.item)
              .attr('role', 'menuitem')
              .on('click', ShareMenuMessage.ClickedCopyLink())
              .children(model.copied ? 'Copied!' : 'Copy link'),
            h.a
              .class(shareMenu.item)
              .attrs({
                role: 'menuitem',
                href: `https://x.com/intent/post?url=${url}&text=${encodeURIComponent(h.props.title)}`,
              })
              .children('Post on X'),
            h.a
              .class(shareMenu.item)
              .attrs({ role: 'menuitem', href: `https://www.linkedin.com/sharing/share-offsite/?url=${url}` })
              .children('Share on LinkedIn'),
          ),
    )
  },
})
