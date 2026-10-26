'use client'

import { Children, useState, type ReactNode } from 'react'
import b from './Button.module.css'
import s from './Paginator.module.css'

export function Paginator({ children }: { children: ReactNode }) {
  const pages = Children.toArray(children)
  const [page, setPage] = useState(0)
  return (
    <div>
      {pages.map((p, i) => (
        <div key={i} hidden={i !== page}>
          {p}
        </div>
      ))}
      <nav className={s.pager} aria-label="Pagination">
        <button className={b.button} disabled={page === 0} onClick={() => setPage(page - 1)}>
          ← Newer
        </button>
        {pages.map((_, i) => (
          <button key={i} className={`${b.button} ${s.page}`} aria-current={i === page ? 'page' : undefined} onClick={() => setPage(i)}>
            {i + 1}
          </button>
        ))}
        <button className={b.button} disabled={page === pages.length - 1} onClick={() => setPage(page + 1)}>
          Older →
        </button>
      </nav>
    </div>
  )
}
