import { UiSchema } from '@effect/ui'
import { Html } from '@effect/ui/html'
import { Schema } from 'effect'

import { faq } from '@bench/content'
import accordion from '@bench/react-ui/Accordion.module.css'

const AccordionMessage = UiSchema.TaggedEnum({ ClickedItem: { index: Schema.Number } })

export const Accordion = Html.component({
  name: 'Accordion',
  model: Schema.Struct({ open: Schema.NullOr(Schema.Number) }),
  message: AccordionMessage,
}).make({
  init: () => ({ open: 0 }),
  update: { ClickedItem: ($, { index }) => $.evolve({ open: open => (open === index ? null : index) }) },
  view: (h, model) =>
    h.div.class(accordion.list).children(
      faq.map((item, index) =>
        h.div
          .key(item.q)
          .class(accordion.item)
          .children(
            h.button
              .class(accordion.trigger)
              .attr('aria-expanded', String(model.open === index))
              .on('click', AccordionMessage.ClickedItem({ index }))
              .children(item.q, h.span.attr('aria-hidden', 'true').children(model.open === index ? '−' : '+')),
            model.open === index && h.p.class(accordion.panel).children(item.a),
          ),
      ),
    ),
})
