import { Query } from '@effect/ui'
import { Effect, Schema } from 'effect'

import { HomeData } from '#domain/Content'

import { Content } from '../services/Content.ts'

// The content only changes with a deploy, so no entry ever goes stale: a
// prerendered page hydrates its results and never refetches them.
export class GetHome extends Query.Service<GetHome>()('content/GetHome', {
  args: {},
  success: HomeData,
  error: Schema.Never,
  staleTime: 'Infinity',
}) {
  static readonly layer = this.toLayer(
    Effect.gen(function* () {
      const content = yield* Content
      return () => content.home
    }),
  )
}
