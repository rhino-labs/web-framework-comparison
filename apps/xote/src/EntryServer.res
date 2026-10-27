// Server entry, bundled by `vite build --ssr` and called by prerender.mjs for
// every path. Data comes from @bench/content/server, which never reaches the
// client bundle.

open Content

@module("@bench/content/server") external homeData: unit => homeData = "homeData"
@module("@bench/content/server") external blogData: unit => blogData = "blogData"
@module("@bench/content/server") external postData: string => Nullable.t<postData> = "postData"
@module("@bench/content/server") external sectionData: string => Nullable.t<sectionData> = "sectionData"
@module("@bench/content/server")
external featureData: (string, string) => Nullable.t<featureData> = "featureData"
@module("@bench/content/server") external searchIndex: unit => array<searchItem> = "searchIndex"
@module("@bench/content/server") external allPaths: unit => array<string> = "allPaths"

let pageFor = (path: string): page => {
  let or = (value, wrap) => value->Nullable.toOption->Option.map(wrap)->Option.getOr(NotFound)
  switch path->String.split("/")->Array.filter(s => s != "") {
  | [] => Home(homeData())
  | ["blog"] => Blog(blogData())
  | ["about"] => About
  | ["blog", slug] => postData(slug)->or(data => Post(data))
  | [section] => sectionData(section)->or(data => Section(data))
  | [section, slug] => featureData(section, slug)->or(data => Feature(data))
  | _ => NotFound
  }
}

type rendered = {html: string, title: string, data: string}

let render = (path: string): rendered => {
  let data = {page: pageFor(path), searchItems: searchIndex()}
  {
    html: SSR.renderToStringWithRoot(() => <App.Page data />, ~rootId="root"),
    title: App.title(data.page),
    data: JSON.stringifyAny(data)->Option.getOr("null"),
  }
}

let paths = allPaths
