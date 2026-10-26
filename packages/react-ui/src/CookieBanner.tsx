'use client'

import { useEffect, useState } from 'react'
import b from './Button.module.css'
import s from './CookieBanner.module.css'

const KEY = 'cookie-consent'

export function CookieBanner() {
  const [dismissed, setDismissed] = useState(false)
  useEffect(() => {
    if (localStorage.getItem(KEY)) setDismissed(true)
  }, [])
  if (dismissed) return null
  return (
    <div className={s.banner} role="region" aria-label="Cookie notice">
      <p className={s.text}>We use one cookie to remember this choice.</p>
      <button
        className={b.button}
        onClick={() => {
          localStorage.setItem(KEY, '1')
          setDismissed(true)
        }}
      >
        OK
      </button>
    </div>
  )
}
