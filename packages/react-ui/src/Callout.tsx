import type { ReactNode } from 'react'
import s from './Callout.module.css'

export function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={s.callout} role="note">
      <p className={s.title}>{title}</p>
      <p className={s.body}>{children}</p>
    </div>
  )
}
