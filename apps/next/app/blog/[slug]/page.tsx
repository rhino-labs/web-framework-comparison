import { notFound } from 'next/navigation'
import { getPost, posts } from '@bench/content'
import { PostPage, postData } from '@bench/react-ui'
import { Link } from '../../link'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return posts.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props) {
  return { title: getPost((await params).slug)?.title }
}

export default async function Post({ params }: Props) {
  const data = postData((await params).slug)
  if (!data) notFound()
  return <PostPage data={data} Link={Link} />
}
