// The same CSS modules the React frameworks use, so the markup and styles
// match. Each binding is the module's class map.

type t = Dict.t<string>

@module("@bench/react-ui/Article.module.css") external article: t = "default"
@module("@bench/react-ui/Accordion.module.css") external accordion: t = "default"
@module("@bench/react-ui/AuthorBio.module.css") external authorBio: t = "default"
@module("@bench/react-ui/BackToTop.module.css") external backToTop: t = "default"
@module("@bench/react-ui/Breadcrumbs.module.css") external breadcrumbs: t = "default"
@module("@bench/react-ui/Button.module.css") external button: t = "default"
@module("@bench/react-ui/Callout.module.css") external callout: t = "default"
@module("@bench/react-ui/CodeBlock.module.css") external codeBlock: t = "default"
@module("@bench/react-ui/Comments.module.css") external comments: t = "default"
@module("@bench/react-ui/ContactForm.module.css") external contactForm: t = "default"
@module("@bench/react-ui/CookieBanner.module.css") external cookieBanner: t = "default"
@module("@bench/react-ui/FeatureLayout.module.css") external feature: t = "default"
@module("@bench/react-ui/Footer.module.css") external footer: t = "default"
@module("@bench/react-ui/Header.module.css") external header: t = "default"
@module("@bench/react-ui/Hero.module.css") external hero: t = "default"
@module("@bench/react-ui/MobileMenu.module.css") external mobileMenu: t = "default"
@module("@bench/react-ui/NewsletterForm.module.css") external newsletter: t = "default"
@module("@bench/react-ui/Paginator.module.css") external paginator: t = "default"
@module("@bench/react-ui/PostCard.module.css") external postCard: t = "default"
@module("@bench/react-ui/PostList.module.css") external postList: t = "default"
@module("@bench/react-ui/PostMeta.module.css") external postMeta: t = "default"
@module("@bench/react-ui/ReadingProgress.module.css") external readingProgress: t = "default"
@module("@bench/react-ui/SearchDialog.module.css") external searchDialog: t = "default"
@module("@bench/react-ui/SectionTitle.module.css") external sectionTitle: t = "default"
@module("@bench/react-ui/ShareMenu.module.css") external shareMenu: t = "default"
@module("@bench/react-ui/Shell.module.css") external shell: t = "default"
@module("@bench/react-ui/Tabs.module.css") external tabs: t = "default"
@module("@bench/react-ui/Tag.module.css") external tag: t = "default"
@module("@bench/react-ui/TeamGrid.module.css") external teamGrid: t = "default"
@module("@bench/react-ui/TableOfContents.module.css") external toc: t = "default"
@module("@bench/react-ui/Widget.module.css") external widget: t = "default"

/** A class from a module; missing classes are an empty string. */
let c = (styles: t, name: string) => styles->Dict.get(name)->Option.getOr("")

let cx = (classes: array<string>) => classes->Array.filter(s => s != "")->Array.join(" ")
