'use client'

import { useState } from 'react'
import b from './Button.module.css'
import s from './ShareMenu.module.css'

export function ShareMenu({ title, path }: { title: string; path: string }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const url = encodeURIComponent(`https://fieldnotes.example${path}`)
  return (
    <div className={s.wrap}>
      <button className={b.button} aria-expanded={open} onClick={() => setOpen(!open)}>
        Share
      </button>
      {open && (
        <div className={s.menu} role="menu">
          <button
            className={s.item}
            role="menuitem"
            onClick={async () => {
              await navigator.clipboard?.writeText(location.href).catch(() => {})
              setCopied(true)
            }}
          >
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <a className={s.item} role="menuitem" href={`https://x.com/intent/post?url=${url}&text=${encodeURIComponent(title)}`}>
            Post on X
          </a>
          <a className={s.item} role="menuitem" href={`https://www.linkedin.com/sharing/share-offsite/?url=${url}`}>
            Share on LinkedIn
          </a>
        </div>
      )}
    </div>
  )
}
