'use client'

import { useEffect, useState } from 'react'
import b from './Button.module.css'
import s from './BackToTop.module.css'

export function BackToTop() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  if (!visible) return null
  return (
    <button className={`${b.button} ${s.button}`} onClick={() => window.scrollTo({ top: 0 })}>
      ↑ Top
    </button>
  )
}
