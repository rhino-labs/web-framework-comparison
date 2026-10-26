import s from './Tag.module.css'

export function Tag({ name }: { name: string }) {
  return <span className={s.tag}>{name}</span>
}
