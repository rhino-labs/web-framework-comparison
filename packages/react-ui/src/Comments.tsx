'use client'

import { useState } from 'react'
import { formatDate, type Comment } from '@bench/content'
import b from './Button.module.css'
import s from './Comments.module.css'

export default function Comments({ comments }: { comments: Comment[] }) {
  const [list, setList] = useState(comments)
  const [draft, setDraft] = useState('')
  return (
    <>
      <ul className={s.list}>
        {list.map(c => (
          <li key={c.id} className={s.comment}>
            <span className={s.author}>{c.author}</span> · <time dateTime={c.date}>{formatDate(c.date)}</time>
            <p className={s.body}>{c.body}</p>
          </li>
        ))}
      </ul>
      <form
        className={s.form}
        onSubmit={e => {
          e.preventDefault()
          if (!draft.trim()) return
          setList([...list, { id: `new-${list.length}`, author: 'you', date: new Date().toISOString().slice(0, 10), body: draft }])
          setDraft('')
        }}
      >
        <textarea className={s.textarea} placeholder="Add a comment" value={draft} onChange={e => setDraft(e.target.value)} />
        <div>
          <button className={`${b.button} ${b.primary}`} type="submit">Post comment</button>
        </div>
      </form>
    </>
  )
}
