import { Command, UiSchema } from '@effect/ui'
import { Html } from '@effect/ui/html'
import { Effect, Schema } from 'effect'

import button from '@bench/react-ui/Button.module.css'
import codeBlock from '@bench/react-ui/CodeBlock.module.css'

import { copyText } from './clipboard.ts'

const CodeBlockMessage = UiSchema.TaggedEnum({
  ClickedCopy: {},
  CompletedCopyCode: {},
})

const CopyCode = Command.make('CopyCode', { args: { code: Schema.String } }, ({ code }) =>
  copyText(() => code).pipe(Effect.as(CodeBlockMessage.CompletedCopyCode())),
)

export const CodeBlock = Html.component({
  name: 'CodeBlock',
  props: Schema.Struct({ code: Schema.String }),
  model: Schema.Struct({ copied: Schema.Boolean }),
  message: CodeBlockMessage,
}).make({
  init: () => ({ copied: false }),
  update: {
    ClickedCopy: $ => $.run(CopyCode.make({ code: $.props.code })),
    CompletedCopyCode: $ => $.evolve({ copied: true }),
  },
  view: (h, model) =>
    h.div.class(codeBlock.wrap).children(
      h.pre.class(codeBlock.pre).children(h.code(h.props.code)),
      h.button
        .class(button.button, codeBlock.copy)
        .on('click', CodeBlockMessage.ClickedCopy())
        .children(model.copied ? 'Copied' : 'Copy'),
    ),
})
