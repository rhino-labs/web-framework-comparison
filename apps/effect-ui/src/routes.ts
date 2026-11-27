import { Route } from '@effect/ui'
import { Schema } from 'effect'

// A literal segment beats a param, so `/blog` and `/about` win over
// `/:section` whatever the order.
export const AppRoute = Route.union({
  Home: Route.make('/'),
  Blog: Route.make('/blog'),
  Post: Route.make('/blog/:slug', { params: { slug: Schema.String } }),
  About: Route.make('/about'),
  Section: Route.make('/:section', { params: { section: Schema.String } }),
  Feature: Route.make('/:section/:slug', { params: { section: Schema.String, slug: Schema.String } }),
  NotFound: Route.make('/*'),
})
export type AppRoute = typeof AppRoute.Type

export const homeUrl = AppRoute.print(AppRoute.Home())
export const blogUrl = AppRoute.print(AppRoute.Blog())
export const aboutUrl = AppRoute.print(AppRoute.About())
export const postUrl = (slug: string) => AppRoute.print(AppRoute.Post({ params: { slug } }))
export const sectionUrl = (section: string) => AppRoute.print(AppRoute.Section({ params: { section } }))
