import type { ReactNode } from 'react'
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'
import { site } from '@bench/content'
import { Shell } from '@bench/react-ui'
import { Link } from './link'
import styles from '@bench/content/styles.css?url'
import type { Route } from './+types/root'

export const links: Route.LinksFunction = () => [{ rel: 'stylesheet', href: styles }]

export const meta: Route.MetaFunction = () => [
  { title: site.name },
  { name: 'description', content: site.tagline },
]

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Shell Link={Link}>{children}</Shell>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return <Outlet />
}
