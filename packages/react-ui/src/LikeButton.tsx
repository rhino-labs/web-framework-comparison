'use client'

import { useState } from 'react'
import b from './Button.module.css'

export function LikeButton() {
  const [likes, setLikes] = useState(0)
  return (
    <button className={b.button} aria-pressed={likes > 0} onClick={() => setLikes(likes + 1)}>
      ♥ {likes} {likes === 1 ? 'like' : 'likes'}
    </button>
  )
}
