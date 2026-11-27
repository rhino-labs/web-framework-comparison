import { Component, UiSchema } from '@effect/ui'
import { Html, HtmlCommand, HtmlSubscription } from '@effect/ui/html'
import { Layer, Schema } from 'effect'
import { AsyncResult } from 'effect/reactivity'

import button from '@bench/react-ui/Button.module.css'
import searchDialog from '@bench/react-ui/SearchDialog.module.css'

import { GetSearchIndex } from '#queries/GetSearchIndex'

import { Content } from '../services/Content.ts'

const SearchDialogMessage = UiSchema.TaggedEnum({
  ClickedOpen: {},
  PressedShortcut: {},
  PressedEscape: {},
  ClickedBackdrop: {},
  UpdatedQuery: { value: Schema.String },
})

const SearchInput = Html.ref('SearchInput', 'input')

const SearchDialogDef = Html.component({
  name: 'SearchDialog',
  model: Schema.Struct({ open: Schema.Boolean, query: Schema.String }),
  message: SearchDialogMessage,
  // The index of every page. It is in the page state of each prerendered
  // page, as the other frameworks ship it with every page.
  queries: { items: { query: GetSearchIndex, args: () => ({}) } },
})

// The field is focused once the render that shows it is committed.
const open = SearchDialogDef.update($ =>
  $.evolve({ open: true, query: '' }).run(HtmlCommand.focus(SearchInput, () => Component.noop)),
)

const SearchDialogNoDeps = SearchDialogDef.make({
  init: () => ({ open: false, query: '' }),
  update: {
    ClickedOpen: open,
    PressedShortcut: $ => ($.model.open ? $.evolve({ open: false }) : $.combine(open)),
    PressedEscape: $ => $.evolve({ open: false }),
    ClickedBackdrop: $ => $.evolve({ open: false }),
    UpdatedQuery: ($, { value }) => $.evolve({ query: value }),
  },
  subscriptions: ({ model }) => [
    HtmlSubscription.onDocument(
      'keydown',
      ({ ctrl, key, meta }) =>
        (ctrl || meta) && key === 'k'
          ? SearchDialogMessage.PressedShortcut()
          : key === 'Escape' && model.open
            ? SearchDialogMessage.PressedEscape()
            : undefined,
      { preventDefault: true },
    ),
  ],
  view: (h, model) => {
    const items = AsyncResult.isSuccess(h.queries.items) ? h.queries.items.value : []
    const normalized = model.query.trim().toLowerCase()
    const results = normalized ? items.filter(item => item.title.toLowerCase().includes(normalized)) : items.slice(0, 6)
    // A view has one root. `display: contents` keeps the button a flex item of
    // the header, as it is in the other frameworks' markup.
    return h.div.attr('style', 'display:contents').children(
      h.button
        .class(button.button)
        .on('click', SearchDialogMessage.ClickedOpen())
        .children('Search', h.span.class(searchDialog.kbd).children('⌘K')),
      model.open &&
        h.div
          .class(searchDialog.backdrop)
          .on('click', SearchDialogMessage.ClickedBackdrop())
          .children(
            // Only the innermost element with a handler gets an event, so a
            // handler that sends nothing keeps a click in the dialog from
            // reaching the backdrop.
            h.div
              .class(searchDialog.dialog)
              .attrs({ role: 'dialog', 'aria-label': 'Search' })
              .on('click', () => undefined)
              .children(
                h.input
                  .ref(SearchInput)
                  .class(searchDialog.input)
                  .attr('placeholder', 'Search posts…')
                  .value(model.query)
                  .on('input', ({ value }) => SearchDialogMessage.UpdatedQuery({ value })),
                results.length > 0
                  ? h.ul
                      .class(searchDialog.results)
                      .children(
                        results.map(item =>
                          h.li
                            .key(item.href)
                            .children(h.a.class(searchDialog.result).attr('href', item.href).children(item.title)),
                        ),
                      )
                  : h.p.class(searchDialog.empty).children(`No posts match “${model.query}”.`),
              ),
          ),
    )
  },
})

export const SearchDialog = SearchDialogNoDeps.pipe(
  Component.provide(GetSearchIndex.layer.pipe(Layer.provide(Content.layerHttp))),
)
