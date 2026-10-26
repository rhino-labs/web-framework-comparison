import type { LinkComponent } from './types'
import s from './Breadcrumbs.module.css'

export function Breadcrumbs({ items, Link }: { items: { label: string; href?: string }[]; Link: LinkComponent }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className={s.crumbs}>
        {items.map(i => (
          <li key={i.label}>{i.href ? <Link href={i.href} className={s.link}>{i.label}</Link> : <span aria-current="page">{i.label}</span>}</li>
        ))}
      </ol>
    </nav>
  )
}
