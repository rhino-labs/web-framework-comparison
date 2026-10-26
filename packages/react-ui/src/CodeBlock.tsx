'use client'

import { useState } from 'react'
import b from './Button.module.css'
import s from './CodeBlock.module.css'

export function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className={s.wrap}>
      <pre className={s.pre}>
        <code>{code}</code>
      </pre>
      <button
        className={`${b.button} ${s.copy}`}
        onClick={async () => {
          await navigator.clipboard?.writeText(code).catch(() => {})
          setCopied(true)
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}
