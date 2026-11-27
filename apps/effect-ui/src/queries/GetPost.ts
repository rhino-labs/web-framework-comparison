import { Query } from '@effect/ui'
import { Effect, Schema } from 'effect'

import { ContentNotFound, PostData } from '#domain/Content'

import { Content } from '../services/Content.ts'

export class GetPost extends Query.Service<GetPost>()('content/GetPost', {
  args: { slug: Schema.String },
  success: PostData,
  error: ContentNotFound,
  staleTime: 'Infinity',
}) {
  static readonly layer = this.toLayer(
    Effect.gen(function* () {
      const content = yield* Content
      return ({ slug }) => content.post(slug)
    }),
  )
}
