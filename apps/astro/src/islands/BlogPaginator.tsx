import { paginate, type PostSummary } from '@bench/content'
import { Paginator } from '@bench/react-ui/components/Paginator'
import { PostList } from '@bench/react-ui/components/PostList'
import { Link } from '../link'

// Like TopicTabs: the island renders the pages it switches between.
export default function BlogPaginator({ posts }: { posts: PostSummary[] }) {
  return (
    <Paginator>
      {paginate(posts).map((page, i) => (
        <PostList key={i} posts={page} Link={Link} />
      ))}
    </Paginator>
  )
}
