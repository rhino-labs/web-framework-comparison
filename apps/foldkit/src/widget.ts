import { Schema } from 'effect'
import { type Html, type HtmlBuilder } from 'foldkit/html'

import type { Message } from './main'

// The generated widgets (src/generated/widgets) are submodels: each exports
// its own init, update and view over this shared state shape. The parent
// model keeps one WidgetState per widget id, created on first interaction.

export const WidgetState = Schema.Struct({
  index: Schema.Number,
  value: Schema.Number,
  flags: Schema.Array(Schema.Boolean),
  text: Schema.String,
})
export type WidgetState = typeof WidgetState.Type

export const WidgetAction = Schema.Literals(['Increment', 'Decrement', 'Select', 'Toggle', 'SetValue', 'SetText', 'Next', 'Previous'])
export type WidgetAction = typeof WidgetAction.Type

export const WidgetMsg = Schema.Struct({
  action: WidgetAction,
  index: Schema.Number,
  value: Schema.Number,
  text: Schema.String,
})
export type WidgetMsg = typeof WidgetMsg.Type

export const blank: WidgetState = { index: 0, value: 0, flags: [], text: '' }

export const widgetMsg = (
  action: WidgetAction,
  fields: { index?: number; value?: number; text?: string } = {},
): WidgetMsg => ({ action, index: 0, value: 0, text: '', ...fields })

export type WidgetModule = {
  init: WidgetState
  update: (state: WidgetState, msg: WidgetMsg) => WidgetState
  view: (state: WidgetState, h: HtmlBuilder<Message>, send: (msg: WidgetMsg) => Message) => Html
}

export const cx = (...classNames: ReadonlyArray<string | undefined | false>): string =>
  classNames.filter(Boolean).join(' ')
