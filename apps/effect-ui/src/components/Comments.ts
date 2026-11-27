import { Command, UiSchema } from '@effect/ui'
import { Html } from '@effect/ui/html'
import { Clock, Effect, Schema } from 'effect'

import { formatDate } from '@bench/content'
import button from '@bench/react-ui/Button.module.css'
import comments from '@bench/react-ui/Comments.module.css'

import { Comment } from '#domain/Content'

const CommentsMessage = UiSchema.TaggedEnum({
  UpdatedDraft: { value: Schema.String },
  SubmittedForm: {},
  CompletedStampComment: { comment: Comment },
})

// `update` is pure, so the date comes from a Command.
const StampComment = Command.make('StampComment', { args: { id: Schema.String, body: Schema.String } }, ({ body, id }) =>
  Clock.currentTimeMillis.pipe(
    Effect.map(millis =>
      CommentsMessage.CompletedStampComment({
        comment: { id, author: 'you', body, date: new Date(millis).toISOString().slice(0, 10) },
      }),
    ),
  ),
)

// Loaded with `Component.lazy` from the post page, once the comments
// section scrolls into view.
export const Comments = Html.component({
  name: 'Comments',
  // `initialComments` seeds the list, which then holds what the reader adds.
  props: Schema.Struct({ initialComments: Schema.Array(Comment) }),
  model: Schema.Struct({ list: Schema.Array(Comment), draft: Schema.String }),
  message: CommentsMessage,
}).make({
  init: $ => ({ list: $.props.initialComments, draft: '' }),
  update: {
    UpdatedDraft: ($, { value }) => $.evolve({ draft: value }),
    SubmittedForm: $ =>
      $.model.draft.trim() === ''
        ? $.model
        : $.evolve({ draft: '' }).run(
            StampComment.make({ id: `new-${$.model.list.length}`, body: $.model.draft }),
          ),
    CompletedStampComment: ($, { comment }) => $.evolve({ list: list => [...list, comment] }),
  },
  view: (h, model) =>
    h.div.attr('style', 'display:contents').children(
      h.ul.class(comments.list).children(
        model.list.map(comment =>
          h.li
            .key(comment.id)
            .class(comments.comment)
            .children(
              h.span.class(comments.author).children(comment.author),
              ' · ',
              h.time.attr('datetime', comment.date).children(formatDate(comment.date)),
              h.p.class(comments.body).children(comment.body),
            ),
        ),
      ),
      h.form
        .class(comments.form)
        .on('submit', CommentsMessage.SubmittedForm())
        .children(
          h.textarea
            .class(comments.textarea)
            .attr('placeholder', 'Add a comment')
            .value(model.draft)
            .on('input', ({ value }) => CommentsMessage.UpdatedDraft({ value })),
          h.div(h.button.class(button.button, button.primary).attr('type', 'submit').children('Post comment')),
        ),
    ),
})
