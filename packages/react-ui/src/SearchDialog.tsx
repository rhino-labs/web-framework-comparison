'use client'

import { useEffect, useState } from 'react'
import b from './Button.module.css'
import s from './SearchDialog.module.css'

export type SearchItem = { title: string; href: string }

export function SearchDialog({ items }: { items: SearchItem[] }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const q = query.trim().toLowerCase()
  const results = q ? items.filter(i => i.title.toLowerCase().includes(q)) : items.slice(0, 6)
  return (
    <>
      <button className={b.button} onClick={() => setOpen(true)}>
        Search<span className={s.kbd}>⌘K</span>
      </button>
      {open && (
        <div className={s.backdrop} onClick={() => setOpen(false)}>
          <div className={s.dialog} role="dialog" aria-label="Search" onClick={e => e.stopPropagation()}>
            <input
              className={s.input}
              autoFocus
              placeholder="Search posts…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {results.length ? (
              <ul className={s.results}>
                {results.map(r => (
                  <li key={r.href}>
                    <a className={s.result} href={r.href}>{r.title}</a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={s.empty}>No posts match “{query}”.</p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
