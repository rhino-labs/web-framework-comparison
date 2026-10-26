import type { Block } from '@bench/content'
import { CodeBlock } from './CodeBlock'

export function ArticleBody({ blocks }: { blocks: Block[] }) {
  return blocks.map((b, i) => {
    switch (b.type) {
      case 'p':
        return <p key={i}>{b.text}</p>
      case 'h2':
        return <h2 key={i} id={b.id}>{b.text}</h2>
      case 'ul':
        return (
          <ul key={i}>
            {b.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        )
      case 'code':
        return <CodeBlock key={i} code={b.text} />
      case 'quote':
        return <blockquote key={i}>{b.text}</blockquote>
    }
  })
}
