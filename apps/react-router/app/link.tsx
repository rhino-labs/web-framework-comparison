import { Link as RouterLink } from 'react-router'
import type { LinkComponent } from '@bench/react-ui'

export const Link: LinkComponent = ({ href, ...props }) => <RouterLink to={href} {...props} />
