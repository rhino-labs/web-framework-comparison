import { UiSchema } from '@effect/ui'
import { Html } from '@effect/ui/html'
import { Schema } from 'effect'

import button from '@bench/react-ui/Button.module.css'

const LikeButtonMessage = UiSchema.TaggedEnum({ ClickedLike: {} })

export const LikeButton = Html.component({
  name: 'LikeButton',
  model: Schema.Struct({ likes: Schema.Number }),
  message: LikeButtonMessage,
}).make({
  init: () => ({ likes: 0 }),
  update: { ClickedLike: $ => $.evolve({ likes: likes => likes + 1 }) },
  view: (h, model) =>
    h.button
      .class(button.button)
      .attr('aria-pressed', String(model.likes > 0))
      .on('click', LikeButtonMessage.ClickedLike())
      .children(`♥ ${model.likes} ${model.likes === 1 ? 'like' : 'likes'}`),
})
