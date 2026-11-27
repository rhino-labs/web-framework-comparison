import { Query } from '@effect/ui'
import { Effect, Schema } from 'effect'

import { ContentNotFound, SectionData } from '#domain/Content'

import { Content } from '../services/Content.ts'

export class GetSection extends Query.Service<GetSection>()('content/GetSection', {
  args: { section: Schema.String },
  success: SectionData,
  error: ContentNotFound,
  staleTime: 'Infinity',
}) {
  static readonly layer = this.toLayer(
    Effect.gen(function* () {
      const content = yield* Content
      return ({ section }) => content.section(section)
    }),
  )
}
