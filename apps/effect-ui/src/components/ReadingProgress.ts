import { Subscription, UiSchema } from '@effect/ui'
import { Html } from '@effect/ui/html'
import { Schema, Stream } from 'effect'

import readingProgress from '@bench/react-ui/ReadingProgress.module.css'

import { onScroll } from './scroll.ts'

const ReadingProgressMessage = UiSchema.TaggedEnum({ ScrolledWindow: { progress: Schema.Number } })

const readProgress = () => {
  const max = document.documentElement.scrollHeight - window.innerHeight
  return max > 0 ? Math.min(1, window.scrollY / max) : 0
}

export const ReadingProgress = Html.component({
  name: 'ReadingProgress',
  model: Schema.Struct({ progress: Schema.Number }),
  message: ReadingProgressMessage,
}).make({
  init: () => ({ progress: 0 }),
  update: { ScrolledWindow: ($, { progress }) => $.evolve({ progress }) },
  subscriptions: () => [
    Subscription.make(
      'scroll',
      onScroll(readProgress).pipe(
        Stream.changes,
        Stream.map(progress => ReadingProgressMessage.ScrolledWindow({ progress })),
      ),
    ),
  ],
  view: (h, model) =>
    h.div
      .class(readingProgress.bar)
      .style({ transform: `scaleX(${model.progress})` })
      .attrs({ role: 'progressbar', 'aria-valuenow': String(Math.round(model.progress * 100)) }),
})
