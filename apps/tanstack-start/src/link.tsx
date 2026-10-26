import { Link as RouterLink } from '@tanstack/react-router'
import type { LinkComponent } from '@bench/react-ui'

// Shared components build hrefs as strings; TanStack's typed `to` accepts any
// matching path at runtime.
export const Link: LinkComponent = ({ href, ...props }) => <RouterLink to={href as '/'} {...props} />
