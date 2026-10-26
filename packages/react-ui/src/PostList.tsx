import type { PostSummary } from '@bench/content'
import type { LinkComponent } from './types'
import { PostCard } from './PostCard'
import s from './PostList.module.css'

export function PostList({ posts, Link }: { posts: PostSummary[]; Link: LinkComponent }) {
  return (
    <ul className={s.list}>
      {posts.map(p => (
        <PostCard key={p.slug} post={p} Link={Link} />
      ))}
    </ul>
  )
}
