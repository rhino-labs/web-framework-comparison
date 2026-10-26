import { site } from '@bench/content'
import { AboutPage } from '@bench/react-ui'
import { Link } from '../link'
import type { Route } from './+types/about'

export const meta: Route.MetaFunction = () => [{ title: `About | ${site.name}` }]

export default function About() {
  return <AboutPage Link={Link} />
}
