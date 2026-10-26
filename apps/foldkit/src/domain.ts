import { Schema } from 'effect'

export const Block = Schema.Union([
  Schema.Struct({ type: Schema.Literal('p'), text: Schema.String }),
  Schema.Struct({ type: Schema.Literal('h2'), id: Schema.String, text: Schema.String }),
  Schema.Struct({ type: Schema.Literal('ul'), items: Schema.Array(Schema.String) }),
  Schema.Struct({ type: Schema.Literal('code'), text: Schema.String }),
  Schema.Struct({ type: Schema.Literal('quote'), text: Schema.String }),
])
export type Block = typeof Block.Type

export const PostSummary = Schema.Struct({
  slug: Schema.String,
  title: Schema.String,
  excerpt: Schema.String,
  date: Schema.String,
  readingMinutes: Schema.Number,
  tags: Schema.Array(Schema.String),
  author: Schema.String,
})
export type PostSummary = typeof PostSummary.Type

export const Post = Schema.Struct({ ...PostSummary.fields, blocks: Schema.Array(Block) })
export type Post = typeof Post.Type

export const Comment = Schema.Struct({
  id: Schema.String,
  author: Schema.String,
  date: Schema.String,
  body: Schema.String,
})
export type Comment = typeof Comment.Type

export const SearchItem = Schema.Struct({ title: Schema.String, href: Schema.String })
export type SearchItem = typeof SearchItem.Type
