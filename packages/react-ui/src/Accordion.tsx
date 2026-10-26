'use client'

import { useState } from 'react'
import s from './Accordion.module.css'

export function Accordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className={s.list}>
      {items.map((item, i) => (
        <div key={item.q} className={s.item}>
          <button className={s.trigger} aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
            {item.q}
            <span aria-hidden>{open === i ? '−' : '+'}</span>
          </button>
          {open === i && <p className={s.panel}>{item.a}</p>}
        </div>
      ))}
    </div>
  )
}
