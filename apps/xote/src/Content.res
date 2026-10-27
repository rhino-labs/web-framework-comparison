// Types mirroring @bench/content, and bindings to its client-safe exports.
// Records compile to plain objects, so the JSON the server embeds decodes
// straight into these types.

type postSummary = {
  slug: string,
  title: string,
  excerpt: string,
  date: string,
  readingMinutes: int,
  tags: array<string>,
  author: string,
}

@tag("type")
type block =
  | @as("p") P({text: string})
  | @as("h2") H2({id: string, text: string})
  | @as("ul") Ul({items: array<string>})
  | @as("code") Code({text: string})
  | @as("quote") Quote({text: string})

type post = {...postSummary, blocks: array<block>}

type heading = {id: string, text: string}
type comment = {id: string, author: string, date: string, body: string}
type searchItem = {title: string, href: string}
type pageLink = {title: string, href: string}
type sectionInfo = {slug: string, title: string, tagline: string}
type sectionPage = {title: string, href: string, tagline: string}
type featureSection = {slug: string, title: string}

type homeData = {latest: array<postSummary>, byTopic: array<array<postSummary>>}
type blogData = {posts: array<postSummary>}
type postData = {post: post, related: array<postSummary>, comments: array<comment>}
type sectionData = {section: sectionInfo, pages: array<sectionPage>}
type featureData = {
  section: featureSection,
  href: string,
  title: string,
  tagline: string,
  paragraphs: array<string>,
  siblings: array<pageLink>,
}

type site = {name: string, tagline: string, about: array<string>}
type member = {name: string, role: string, bio: string}
type faqItem = {q: string, a: string}

@module("@bench/content") external site: site = "site"
@module("@bench/content") external sections: array<sectionInfo> = "sections"
@module("@bench/content") external team: array<member> = "team"
@module("@bench/content") external faq: array<faqItem> = "faq"
@module("@bench/content") external homeTopics: array<string> = "homeTopics"
@module("@bench/content") external formatDate: string => string = "formatDate"
@module("@bench/content") external paginate: array<'a> => array<array<'a>> = "paginate"
@module("@bench/content") external headingsOf: post => array<heading> = "headingsOf"

/** Everything one page renders, embedded in the HTML for hydration (the
 same data the React frameworks serialize, or Foldkit passes in Flags). */
type page =
  | Home(homeData)
  | Blog(blogData)
  | Post(postData)
  | About
  | Section(sectionData)
  | Feature(featureData)
  | NotFound

type pageData = {page: page, searchItems: array<searchItem>}
