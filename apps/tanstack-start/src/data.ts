import { createServerFn } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'
import { blogData, homeData, postData } from '@bench/react-ui'

// Server functions keep the content module (every post body) out of the
// client bundle; loaders are isomorphic and would otherwise ship it.
export const getHome = createServerFn({ method: 'GET' }).handler(() => homeData())

export const getBlog = createServerFn({ method: 'GET' }).handler(() => blogData())

export const getPostPage = createServerFn({ method: 'GET' })
  .validator((slug: string) => slug)
  .handler(({ data: slug }) => {
    const data = postData(slug)
    if (!data) throw notFound()
    return data
  })
