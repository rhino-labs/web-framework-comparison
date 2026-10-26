import { site } from '@bench/content'
import { BlogPage, blogData } from '@bench/react-ui'
import { Link } from '../link'
import type { Route } from './+types/blog'

export const loader = () => blogData()

export const meta: Route.MetaFunction = () => [{ title: `Blog | ${site.name}` }]

export default function BlogIndex({ loaderData }: Route.ComponentProps) {
  return <BlogPage data={loaderData} Link={Link} />
}
