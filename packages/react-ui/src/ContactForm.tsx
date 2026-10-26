'use client'

import { useState } from 'react'
import b from './Button.module.css'
import s from './ContactForm.module.css'

type Fields = { name: string; email: string; message: string }

const validate = (f: Fields): Partial<Fields> => ({
  ...(f.name.trim() ? {} : { name: 'Tell us your name.' }),
  ...(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email) ? {} : { email: 'Enter a valid email.' }),
  ...(f.message.trim().length >= 10 ? {} : { message: 'At least 10 characters, please.' }),
})

export function ContactForm() {
  const [fields, setFields] = useState<Fields>({ name: '', email: '', message: '' })
  const [errors, setErrors] = useState<Partial<Fields>>({})
  const [sent, setSent] = useState(false)
  if (sent) return <p className={s.success}>Thanks, {fields.name}. We will reply soon.</p>
  const field = (key: keyof Fields, label: string, multiline = false) => (
    <label className={s.field}>
      {label}
      {multiline ? (
        <textarea className={s.input} value={fields[key]} onChange={e => setFields({ ...fields, [key]: e.target.value })} />
      ) : (
        <input className={s.input} value={fields[key]} onChange={e => setFields({ ...fields, [key]: e.target.value })} />
      )}
      {errors[key] && <span className={s.error}>{errors[key]}</span>}
    </label>
  )
  return (
    <form
      className={s.form}
      noValidate
      onSubmit={e => {
        e.preventDefault()
        const next = validate(fields)
        setErrors(next)
        if (!Object.keys(next).length) setSent(true)
      }}
    >
      {field('name', 'Name')}
      {field('email', 'Email')}
      {field('message', 'Message', true)}
      <div>
        <button className={`${b.button} ${b.primary}`} type="submit">Send</button>
      </div>
    </form>
  )
}
