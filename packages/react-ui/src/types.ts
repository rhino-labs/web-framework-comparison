import type { ReactNode } from 'react'

/** Each framework passes its own client-side Link, adapted to this shape. */
export type LinkComponent = (props: { href: string; className?: string; children: ReactNode }) => ReactNode
