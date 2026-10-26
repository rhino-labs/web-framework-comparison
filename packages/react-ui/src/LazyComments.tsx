'use client'

import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import type { Comment } from '@bench/content'
import s from './Comments.module.css'

// Comments are below the fold: their code is split into a lazy chunk and only
// loaded when the section scrolls into view.
const Comments = lazy(() => import('./Comments'))

export function LazyComments({ comments }: { comments: Comment[] }) {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setVisible(true)
        observer.disconnect()
      }
    })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  const placeholder = <p className={s.placeholder}>Loading comments…</p>
  return (
    <section ref={ref} className={s.section} aria-label="Comments">
      <h2>Comments ({comments.length})</h2>
      {visible ? (
        <Suspense fallback={placeholder}>
          <Comments comments={comments} />
        </Suspense>
      ) : (
        placeholder
      )}
    </section>
  )
}
