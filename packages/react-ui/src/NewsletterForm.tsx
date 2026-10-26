'use client'

import { useState } from 'react'
import b from './Button.module.css'
import s from './NewsletterForm.module.css'

type Status = 'idle' | 'invalid' | 'subscribed'

export function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  if (status === 'subscribed') return <p className={s.success}>Thanks, {email} is subscribed.</p>
  return (
    <form
      className={s.form}
      noValidate
      onSubmit={e => {
        e.preventDefault()
        setStatus(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? 'subscribed' : 'invalid')
      }}
    >
      <p className={s.title}>Get new essays by email</p>
      <div className={s.row}>
        <input
          className={s.input}
          type="email"
          placeholder="you@example.com"
          aria-invalid={status === 'invalid'}
          value={email}
          onChange={e => {
            setEmail(e.target.value)
            setStatus('idle')
          }}
        />
        <button className={`${b.button} ${b.primary}`} type="submit">Subscribe</button>
      </div>
      {status === 'invalid' && <p className={s.error}>Enter a valid email address.</p>}
    </form>
  )
}
