import type { ReactNode } from 'react'
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { site, type SearchItem } from '@bench/content'
import { Shell } from '@bench/react-ui'
import { Link } from '../link'
import { getSearchIndex } from '../data'
import styles from '@bench/content/styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: site.name },
      { name: 'description', content: site.tagline },
    ],
    links: [{ rel: 'stylesheet', href: styles }],
  }),
  loader: () => getSearchIndex(),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument searchItems={Route.useLoaderData()}>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ searchItems, children }: { searchItems: SearchItem[]; children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Shell Link={Link} searchItems={searchItems}>{children}</Shell>
        <Scripts />
      </body>
    </html>
  )
}
