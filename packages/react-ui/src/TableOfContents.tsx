'use client'

import { useEffect, useState } from 'react'
import type { Heading } from '@bench/content'
import s from './TableOfContents.module.css'

export function TableOfContents({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.find(e => e.isIntersecting)
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '0px 0px -70% 0px' },
    )
    for (const h of headings) {
      const el = document.getElementById(h.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [headings])
  return (
    <nav className={s.toc} aria-label="On this page">
      <p className={s.title}>On this page</p>
      <ol className={s.list}>
        {headings.map(h => (
          <li key={h.id}>
            <a className={`${s.link} ${active === h.id ? s.active : ''}`} href={`#${h.id}`}>
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
