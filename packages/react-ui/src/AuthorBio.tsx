import { team } from '@bench/content'
import s from './AuthorBio.module.css'

export function AuthorBio({ name }: { name: string }) {
  const member = team.find(m => m.name === name)
  return (
    <aside className={s.bio}>
      <div className={s.avatar} aria-hidden>{name.split(' ').map(w => w[0]).join('')}</div>
      <div>
        <p className={s.name}>{name}</p>
        <p className={s.text}>{member?.bio}</p>
      </div>
    </aside>
  )
}
