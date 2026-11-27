import { UiSchema } from '@effect/ui'
import { Html } from '@effect/ui/html'
import { Schema } from 'effect'

import button from '@bench/react-ui/Button.module.css'
import newsletter from '@bench/react-ui/NewsletterForm.module.css'

export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const NewsletterFormMessage = UiSchema.TaggedEnum({
  UpdatedEmail: { value: Schema.String },
  SubmittedForm: {},
})

export const NewsletterForm = Html.component({
  name: 'NewsletterForm',
  model: Schema.Struct({ email: Schema.String, status: Schema.Literals(['Idle', 'Invalid', 'Submitted']) }),
  message: NewsletterFormMessage,
}).make({
  init: () => ({ email: '', status: 'Idle' as const }),
  update: {
    UpdatedEmail: ($, { value }) => $.evolve({ email: value, status: 'Idle' }),
    SubmittedForm: $ => $.evolve({ status: EMAIL_PATTERN.test($.model.email) ? 'Submitted' : 'Invalid' }),
  },
  view: (h, model) =>
    model.status === 'Submitted'
      ? h.p.class(newsletter.success).children(`Thanks, ${model.email} is subscribed.`)
      : h.form
          .class(newsletter.form)
          .attr('novalidate', '')
          .on('submit', NewsletterFormMessage.SubmittedForm())
          .children(
            h.p.class(newsletter.title).children('Get new essays by email'),
            h.div.class(newsletter.row).children(
              h.input
                .class(newsletter.input)
                .attrs({ type: 'email', placeholder: 'you@example.com', 'aria-invalid': String(model.status === 'Invalid') })
                .value(model.email)
                .on('input', ({ value }) => NewsletterFormMessage.UpdatedEmail({ value })),
              h.button.class(button.button, button.primary).attr('type', 'submit').children('Subscribe'),
            ),
            model.status === 'Invalid' && h.p.class(newsletter.error).children('Enter a valid email address.'),
          ),
})
