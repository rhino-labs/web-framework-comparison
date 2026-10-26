import type { Metadata } from 'next'
import { site } from '@bench/content'
import { Shell } from '@bench/react-ui'
import { Link } from './link'
import '@bench/content/styles.css'

export const metadata: Metadata = {
  title: { default: site.name, template: `%s | ${site.name}` },
  description: site.tagline,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Shell Link={Link}>{children}</Shell>
      </body>
    </html>
  )
}
