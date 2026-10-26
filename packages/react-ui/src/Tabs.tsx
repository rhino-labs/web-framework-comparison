'use client'

import { Children, useState, type ReactNode } from 'react'
import s from './Tabs.module.css'

export function Tabs({ labels, children }: { labels: string[]; children: ReactNode }) {
  const [selected, setSelected] = useState(0)
  const panels = Children.toArray(children)
  return (
    <div>
      <div className={s.tablist} role="tablist">
        {labels.map((label, i) => (
          <button key={label} className={s.tab} role="tab" aria-selected={i === selected} onClick={() => setSelected(i)}>
            {label}
          </button>
        ))}
      </div>
      {panels.map((panel, i) => (
        <div key={i} role="tabpanel" hidden={i !== selected}>
          {panel}
        </div>
      ))}
    </div>
  )
}
