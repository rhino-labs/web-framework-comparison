import { Query } from '@effect/ui'
import { Effect, Schema } from 'effect'

import { SearchItem } from '#domain/Content'

import { Content } from '../services/Content.ts'

export class GetSearchIndex extends Query.Service<GetSearchIndex>()('content/GetSearchIndex', {
  args: {},
  success: Schema.Array(SearchItem),
  error: Schema.Never,
  staleTime: 'Infinity',
}) {
  static readonly layer = this.toLayer(
    Effect.gen(function* () {
      const content = yield* Content
      return () => content.search
    }),
  )
}
