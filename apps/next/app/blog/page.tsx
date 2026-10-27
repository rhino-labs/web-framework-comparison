import { blogData } from '@bench/content/server'
import { BlogPage } from '@bench/react-ui'
import { Link } from '../link'

export const metadata = { title: 'Blog' }

export default function BlogIndex() {
  return <BlogPage data={blogData()} Link={Link} />
}
