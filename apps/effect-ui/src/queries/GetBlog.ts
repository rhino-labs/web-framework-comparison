import { Query } from '@effect/ui'
import { Effect, Schema } from 'effect'

import { BlogData } from '#domain/Content'

import { Content } from '../services/Content.ts'

export class GetBlog extends Query.Service<GetBlog>()('content/GetBlog', {
  args: {},
  success: BlogData,
  error: Schema.Never,
  staleTime: 'Infinity',
}) {
  static readonly layer = this.toLayer(
    Effect.gen(function* () {
      const content = yield* Content
      return () => content.blog
    }),
  )
}
