import { type RouteConfig, index, route } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),
  route('blog', 'routes/blog.tsx'),
  route('blog/:slug', 'routes/post.tsx'),
  route('about', 'routes/about.tsx'),
] satisfies RouteConfig
