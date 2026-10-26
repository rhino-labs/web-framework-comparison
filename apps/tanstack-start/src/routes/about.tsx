import { createFileRoute } from '@tanstack/react-router'
import { site } from '@bench/content'
import { AboutPage } from '@bench/react-ui'
import { Link } from '../link'

export const Route = createFileRoute('/about')({
  head: () => ({ meta: [{ title: `About | ${site.name}` }] }),
  component: () => <AboutPage Link={Link} />,
})
