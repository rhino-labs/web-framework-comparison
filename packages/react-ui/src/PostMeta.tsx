import { formatDate } from '@bench/content'
import { Tag } from './Tag'
import s from './PostMeta.module.css'

export function PostMeta({ date, readingMinutes, author, tags = [] }: { date: string; readingMinutes: number; author?: string; tags?: string[] }) {
  return (
    <div className={s.meta}>
      {author && <span>{author}</span>}
      <time dateTime={date}>{formatDate(date)}</time>
      <span>{readingMinutes} min read</span>
      {tags.map(t => (
        <Tag key={t} name={t} />
      ))}
    </div>
  )
}
