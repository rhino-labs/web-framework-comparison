import type { ReactNode } from 'react'
import s from './SectionTitle.module.css'

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className={s.title}>{children}</h2>
}
