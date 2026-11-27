import { Query } from '@effect/ui'
import { Effect, Schema } from 'effect'

import { ContentNotFound, FeatureData } from '#domain/Content'

import { Content } from '../services/Content.ts'

export class GetFeature extends Query.Service<GetFeature>()('content/GetFeature', {
  args: { section: Schema.String, slug: Schema.String },
  success: FeatureData,
  error: ContentNotFound,
  staleTime: 'Infinity',
}) {
  static readonly layer = this.toLayer(
    Effect.gen(function* () {
      const content = yield* Content
      return ({ section, slug }) => content.feature(section, slug)
    }),
  )
}
