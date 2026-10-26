'use client'

import { useEffect, useState } from 'react'
import s from './ReadingProgress.module.css'

export function ReadingProgress() {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return <div className={s.bar} style={{ transform: `scaleX(${progress})` }} role="progressbar" aria-valuenow={Math.round(progress * 100)} />
}
