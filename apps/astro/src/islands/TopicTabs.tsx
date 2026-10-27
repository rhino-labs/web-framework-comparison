import type { PostSummary } from '@bench/content'
import { Tabs } from '@bench/react-ui/components/Tabs'
import { PostList } from '@bench/react-ui/components/PostList'
import { Link } from '../link'

// An island can't split children passed from an .astro template into tab
// panels, so this island renders its panels itself from data.
export default function TopicTabs({ labels, byTopic }: { labels: string[]; byTopic: PostSummary[][] }) {
  return (
    <Tabs labels={labels}>
      {byTopic.map((posts, i) => (
        <PostList key={labels[i]} posts={posts} Link={Link} />
      ))}
    </Tabs>
  )
}
