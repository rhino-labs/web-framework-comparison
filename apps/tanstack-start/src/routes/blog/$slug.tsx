import { createFileRoute } from '@tanstack/react-router'
import { site } from '@bench/content'
import { PostPage } from '@bench/react-ui'
import { Link } from '../../link'
import { getPostPage } from '../../data'

export const Route = createFileRoute('/blog/$slug')({
  loader: ({ params }) => getPostPage({ data: params.slug }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.post.title} | ${site.name}` : site.name }],
  }),
  component: () => <PostPage data={Route.useLoaderData()} Link={Link} />,
})
