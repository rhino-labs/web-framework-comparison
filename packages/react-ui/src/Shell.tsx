import type { ReactNode } from 'react'
import { sections, site, type SearchItem } from '@bench/content'
import type { LinkComponent } from './types'
import { MobileMenu } from './MobileMenu'
import { SearchDialog } from './SearchDialog'
import { ThemeToggle } from './ThemeToggle'
import { NewsletterForm } from './NewsletterForm'
import { BackToTop } from './BackToTop'
import { CookieBanner } from './CookieBanner'
import s from './Shell.module.css'
import h from './Header.module.css'
import f from './Footer.module.css'

export function Shell({ Link, searchItems, children }: { Link: LinkComponent; searchItems: SearchItem[]; children: ReactNode }) {
  return (
    <div className={s.shell}>
      <header className={h.header}>
        <Link href="/" className={h.brand}>{site.name}</Link>
        <MobileMenu>
          <Link href="/blog" className={h.navLink}>Blog</Link>
          {sections.map(s => (
            <Link key={s.slug} href={`/${s.slug}`} className={h.navLink}>{s.title}</Link>
          ))}
          <Link href="/about" className={h.navLink}>About</Link>
        </MobileMenu>
        <SearchDialog items={searchItems} />
        <ThemeToggle />
      </header>
      <main className={s.main}>{children}</main>
      <footer className={f.footer}>
        <div className={f.columns}>
          <NewsletterForm />
          <ul className={f.links}>
            <li><Link href="/blog">Blog</Link></li>
            {sections.map(s => (
              <li key={s.slug}><Link href={`/${s.slug}`}>{s.title}</Link></li>
            ))}
            <li><Link href="/about">About</Link></li>
          </ul>
        </div>
        <p className={f.copy}>© 2026 {site.name}</p>
      </footer>
      <BackToTop />
      <CookieBanner />
    </div>
  )
}
