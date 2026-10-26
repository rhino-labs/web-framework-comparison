import type { PostSummary } from '@bench/content'
import type { LinkComponent } from './types'
import { PostMeta } from './PostMeta'
import s from './PostCard.module.css'

export function PostCard({ post, Link }: { post: PostSummary; Link: LinkComponent }) {
  return (
    <li className={s.card}>
      <h3>
        <Link href={`/blog/${post.slug}`} className={s.link}>{post.title}</Link>
      </h3>
      <PostMeta date={post.date} readingMinutes={post.readingMinutes} tags={post.tags} />
      <p className={s.excerpt}>{post.excerpt}</p>
    </li>
  )
}
