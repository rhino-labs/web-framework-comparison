import type { LinkComponent } from '@bench/react-ui'

// Astro sites are multi-page: links are plain anchors and navigation is a
// full document load.
export const Link: LinkComponent = ({ href, className, children }) => (
  <a href={href} className={className}>
    {children}
  </a>
)
