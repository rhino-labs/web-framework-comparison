'use client'

import { useState, type ReactNode } from 'react'
import b from './Button.module.css'
import s from './MobileMenu.module.css'

export function MobileMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`${s.wrap} ${open ? s.open : ''}`}>
      <button className={`${b.button} ${s.toggle}`} aria-expanded={open} onClick={() => setOpen(!open)}>
        Menu
      </button>
      <nav className={s.nav}>{children}</nav>
    </div>
  )
}
