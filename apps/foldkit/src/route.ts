import { Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion, literal, slash, string } from 'foldkit/route'

export const AppRoute = defineRouteUnion({
  Home: {},
  Blog: {},
  BlogPost: { slug: Schema.String },
  About: {},
  NotFound: { path: Schema.String },
})

export type AppRoute = typeof AppRoute.Type

export const homeRouter = pipe(Route.root, Route.mapTo(AppRoute.Home))
export const blogRouter = pipe(literal('blog'), Route.mapTo(AppRoute.Blog))
export const blogPostRouter = pipe(
  literal('blog'),
  slash(string('slug')),
  Route.mapTo(AppRoute.BlogPost),
)
export const aboutRouter = pipe(literal('about'), Route.mapTo(AppRoute.About))

const routeParser = Route.oneOf(blogPostRouter, blogRouter, aboutRouter, homeRouter)

export const urlToAppRoute = Route.parseUrlWithFallback(routeParser, AppRoute.NotFound)
