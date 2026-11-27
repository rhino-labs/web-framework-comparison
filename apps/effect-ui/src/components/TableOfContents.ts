import { Subscription, UiSchema } from '@effect/ui'
import { Html } from '@effect/ui/html'
import { Effect, Queue, Schema, Stream } from 'effect'

import toc from '@bench/react-ui/TableOfContents.module.css'

const Heading = Schema.Struct({ id: Schema.String, text: Schema.String })

const TableOfContentsMessage = UiSchema.TaggedEnum({ EnteredHeading: { id: Schema.String } })

// The headings are the article's, outside this component, so they are
// observed by id, as the React version does.
const enteredHeadings = (ids: ReadonlyArray<string>): Stream.Stream<string> =>
  Stream.callback<string>(queue =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const observer = new IntersectionObserver(
          entries => {
            const visible = entries.find(entry => entry.isIntersecting)
            if (visible) Queue.offerUnsafe(queue, visible.target.id)
          },
          { rootMargin: '0px 0px -70% 0px' },
        )
        for (const id of ids) {
          const element = document.getElementById(id)
          if (element) observer.observe(element)
        }
        return observer
      }),
      observer => Effect.sync(() => observer.disconnect()),
    ),
  )

export const TableOfContents = Html.component({
  name: 'TableOfContents',
  props: Schema.Struct({ headings: Schema.Array(Heading) }),
  model: Schema.Struct({ active: Schema.NullOr(Schema.String) }),
  message: TableOfContentsMessage,
}).make({
  init: () => ({ active: null }),
  update: { EnteredHeading: ($, { id }) => $.evolve({ active: id }) },
  subscriptions: ({ props }) => [
    Subscription.make(
      'headings',
      props.headings.map(heading => heading.id),
      ids => enteredHeadings(ids).pipe(Stream.map(id => TableOfContentsMessage.EnteredHeading({ id }))),
    ),
  ],
  view: (h, model) =>
    h.nav
      .class(toc.toc)
      .attr('aria-label', 'On this page')
      .children(
        h.p.class(toc.title).children('On this page'),
        h.ol
          .class(toc.list)
          .children(
            h.props.headings.map(heading =>
              h.li
                .key(heading.id)
                .children(
                  h.a
                    .class(toc.link, model.active === heading.id && toc.active)
                    .attr('href', `#${heading.id}`)
                    .children(heading.text),
                ),
            ),
          ),
      ),
})
