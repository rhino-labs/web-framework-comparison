import { createFileRoute } from '@tanstack/react-router'
import { site } from '@bench/content'
import { BlogPage } from '@bench/react-ui'
import { Link } from '../../link'
import { getBlog } from '../../data'

export const Route = createFileRoute('/blog/')({
  loader: () => getBlog(),
  head: () => ({ meta: [{ title: `Blog | ${site.name}` }] }),
  component: () => <BlogPage data={Route.useLoaderData()} Link={Link} />,
})
