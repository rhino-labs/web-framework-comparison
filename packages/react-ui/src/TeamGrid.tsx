import { team } from '@bench/content'
import s from './TeamGrid.module.css'

export function TeamGrid() {
  return (
    <ul className={s.grid}>
      {team.map(m => (
        <li key={m.name} className={s.member}>
          <p className={s.name}>{m.name}</p>
          <p className={s.role}>{m.role}</p>
          <p className={s.bio}>{m.bio}</p>
        </li>
      ))}
    </ul>
  )
}
