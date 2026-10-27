import { type RouteConfig, index, route } from '@react-router/dev/routes'
import { generatedRoutes } from './generated/routes'

export default [
  index('routes/home.tsx'),
  route('blog', 'routes/blog.tsx'),
  route('blog/:slug', 'routes/post.tsx'),
  route('about', 'routes/about.tsx'),
  ...generatedRoutes,
] satisfies RouteConfig
