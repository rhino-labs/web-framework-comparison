import { UiSchema } from '@effect/ui'
import { Html } from '@effect/ui/html'
import { Schema } from 'effect'

import button from '@bench/react-ui/Button.module.css'
import contactForm from '@bench/react-ui/ContactForm.module.css'

import { EMAIL_PATTERN } from './NewsletterForm.ts'

const ContactField = Schema.Literals(['name', 'email', 'message'])
type ContactField = typeof ContactField.Type

const ContactFormMessage = UiSchema.TaggedEnum({
  UpdatedField: { field: ContactField, value: Schema.String },
  SubmittedForm: {},
})

const ContactFormModel = Schema.Struct({
  name: Schema.String,
  email: Schema.String,
  message: Schema.String,
  errors: Schema.Array(ContactField),
  submitted: Schema.Boolean,
})

const errorsOf = (model: typeof ContactFormModel.Type): ReadonlyArray<ContactField> =>
  ContactField.literals.filter(field =>
    field === 'name'
      ? model.name.trim() === ''
      : field === 'email'
        ? !EMAIL_PATTERN.test(model.email)
        : model.message.trim().length < 10,
  )

const ContactFormDef = Html.component({
  name: 'ContactForm',
  model: ContactFormModel,
  message: ContactFormMessage,
})

const Field = ContactFormDef.fragment((h, model: typeof ContactFormModel.Type, field: ContactField, label: string, error: string) => {
  const updated = ({ value }: { readonly value: string }) => ContactFormMessage.UpdatedField({ field, value })
  return h.label
    .class(contactForm.field)
    .children(
      label,
      field === 'message'
        ? h.textarea.class(contactForm.input).value(model[field]).on('input', updated)
        : h.input.class(contactForm.input).value(model[field]).on('input', updated),
      model.errors.includes(field) && h.span.class(contactForm.error).children(error),
    )
})

export const ContactForm = ContactFormDef.make({
  init: () => ({ name: '', email: '', message: '', errors: [], submitted: false }),
  update: {
    UpdatedField: ($, { field, value }) => $.evolve({ [field]: value }),
    SubmittedForm: $ => {
      const errors = errorsOf($.model)
      return $.evolve({ errors, submitted: errors.length === 0 })
    },
  },
  view: (h, model) =>
    model.submitted
      ? h.p.class(contactForm.success).children(`Thanks, ${model.name}. We will reply soon.`)
      : h.form
          .class(contactForm.form)
          .attr('novalidate', '')
          .on('submit', ContactFormMessage.SubmittedForm())
          .children(
            Field(h, model, 'name', 'Name', 'Tell us your name.'),
            Field(h, model, 'email', 'Email', 'Enter a valid email.'),
            Field(h, model, 'message', 'Message', 'At least 10 characters, please.'),
            h.div(h.button.class(button.button, button.primary).attr('type', 'submit').children('Send')),
          ),
})
