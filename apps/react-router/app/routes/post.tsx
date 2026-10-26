import { data } from 'react-router'
import { site } from '@bench/content'
import { PostPage, postData } from '@bench/react-ui'
import { Link } from '../link'
import type { Route } from './+types/post'

export const loader = ({ params }: Route.LoaderArgs) => {
  const result = postData(params.slug)
  if (!result) throw data('Not found', { status: 404 })
  return result
}

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData ? `${loaderData.post.title} | ${site.name}` : site.name },
]

export default function Post({ loaderData }: Route.ComponentProps) {
  return <PostPage data={loaderData} Link={Link} />
}
