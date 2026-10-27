open Content

let title = (page: page) =>
  switch page {
  | Home(_) => site.name
  | Blog(_) => `Blog | ${site.name}`
  | Post({post}) => `${post.title} | ${site.name}`
  | About => `About | ${site.name}`
  | Section({section}) => `${section.title} | ${site.name}`
  | Feature({title}) => `${title} | ${site.name}`
  | NotFound => `Not Found | ${site.name}`
  }

module Page = {
  @xote.component
  let make = (~data: pageData) =>
    <Ui.Shell searchItems={data.searchItems}>
      {switch data.page {
      | Home(data) => <Pages.HomePage data />
      | Blog(data) => <Pages.BlogPage data />
      | Post(data) => <Pages.PostPage data />
      | About => <Pages.AboutPage />
      | Section(data) => <Pages.SectionPage data />
      | Feature(data) => <Pages.FeaturePage data />
      | NotFound => <Pages.NotFoundPage />
      }}
    </Ui.Shell>
}
