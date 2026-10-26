'use client'

import { useState } from 'react'
import b from './Button.module.css'

export function ThemeToggle() {
  const [dark, setDark] = useState(false)
  return (
    <button
      className={b.button}
      aria-pressed={dark}
      onClick={() => {
        const next = !dark
        setDark(next)
        document.documentElement.dataset.theme = next ? 'dark' : 'light'
      }}
    >
      {dark ? 'Light' : 'Dark'} mode
    </button>
  )
}
