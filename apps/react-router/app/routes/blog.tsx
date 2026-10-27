import { site } from '@bench/content'
import { blogData } from '@bench/content/server'
import { BlogPage } from '@bench/react-ui'
import { Link } from '../link'
import type { Route } from './+types/blog'

export const loader = () => blogData()

export const meta: Route.MetaFunction = () => [{ title: `Blog | ${site.name}` }]

export default function BlogIndex({ loaderData }: Route.ComponentProps) {
  return <BlogPage data={loaderData} Link={Link} />
}
