import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '@bench/react-ui'
import { Link } from '../link'
import { getHome } from '../data'

export const Route = createFileRoute('/')({
  loader: () => getHome(),
  component: () => <HomePage data={Route.useLoaderData()} Link={Link} />,
})
