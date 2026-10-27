import { createServerFn } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'
import { blogData, featureData, homeData, postData, searchIndex, sectionData } from '@bench/content/server'

// Server functions keep the content module (every post body) out of the
// client bundle; loaders are isomorphic and would otherwise ship it.
export const getSearchIndex = createServerFn({ method: 'GET' }).handler(() => searchIndex())

export const getHome = createServerFn({ method: 'GET' }).handler(() => homeData())

export const getBlog = createServerFn({ method: 'GET' }).handler(() => blogData())

export const getPostPage = createServerFn({ method: 'GET' })
  .validator((slug: string) => slug)
  .handler(({ data: slug }) => {
    const data = postData(slug)
    if (!data) throw notFound()
    return data
  })

export const getSection = createServerFn({ method: 'GET' })
  .validator((slug: string) => slug)
  .handler(({ data: slug }) => {
    const data = sectionData(slug)
    if (!data) throw notFound()
    return data
  })

export const getFeature = createServerFn({ method: 'GET' })
  .validator((input: { section: string; slug: string }) => input)
  .handler(({ data: { section, slug } }) => {
    const data = featureData(section, slug)
    if (!data) throw notFound()
    return data
  })
