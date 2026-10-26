import { HomePage, homeData } from '@bench/react-ui'
import { Link } from '../link'
import type { Route } from './+types/home'

// Framework-mode loaders run only on the server and are stripped from the
// client bundle, so the content module stays server-side.
export const loader = () => homeData()

export default function Home({ loaderData }: Route.ComponentProps) {
  return <HomePage data={loaderData} Link={Link} />
}
