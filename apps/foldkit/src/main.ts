import { Array, Clock, Effect, Option, Schema, Stream } from 'effect'
import { Command, Runtime, Subscription, type Update } from 'foldkit'
import { focus, streamFromEvent, streamFromEventFilterMap } from 'foldkit/dom'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest, load } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'
import { Url, toString as urlToString } from 'foldkit/url'

import { Comment, FeatureData, Post, PostSummary, SearchItem, SectionData } from './domain'
import { widgets } from './generated/widgets'
import { AppRoute, urlToAppRoute } from './route'
import { WidgetMsg, WidgetState } from './widget'

// MODEL

export const Theme = Schema.Literals(['Light', 'Dark'])
export type Theme = typeof Theme.Type

export const SubmitStatus = Schema.Literals(['Idle', 'Invalid', 'Submitted'])
export type SubmitStatus = typeof SubmitStatus.Type

export const ContactField = Schema.Literals(['name', 'email', 'message'])
export type ContactField = typeof ContactField.Type

export const Contact = Schema.Struct({
  name: Schema.String,
  email: Schema.String,
  message: Schema.String,
  errors: Schema.Array(ContactField),
  status: SubmitStatus,
})
export type Contact = typeof Contact.Type

export const Model = Schema.Struct({
  route: AppRoute,
  summaries: Schema.Array(PostSummary),
  byTopic: Schema.Array(Schema.Array(PostSummary)),
  maybePost: Schema.Option(Post),
  maybeSection: Schema.Option(SectionData),
  maybeFeature: Schema.Option(FeatureData),
  widgets: Schema.Record(Schema.String, WidgetState),
  comments: Schema.Array(Comment),
  searchItems: Schema.Array(SearchItem),
  theme: Theme,
  isMenuOpen: Schema.Boolean,
  isSearchOpen: Schema.Boolean,
  searchQuery: Schema.String,
  newsletterEmail: Schema.String,
  newsletterStatus: SubmitStatus,
  scrollY: Schema.Number,
  readingProgress: Schema.Number,
  maybeActiveHeadingId: Schema.Option(Schema.String),
  areCommentsVisible: Schema.Boolean,
  isCookieBannerDismissed: Schema.Boolean,
  likes: Schema.Number,
  isShareOpen: Schema.Boolean,
  isLinkCopied: Schema.Boolean,
  isCodeCopied: Schema.Boolean,
  commentDraft: Schema.String,
  selectedTopic: Schema.Number,
  blogPage: Schema.Number,
  maybeOpenFaq: Schema.Option(Schema.Number),
  contact: Contact,
})
export type Model = typeof Model.Type

// FLAGS

// NOTE: the server passes only the data the current page needs, the same
// payload the React frameworks serialize for hydration.
export const Flags = Schema.Struct({
  summaries: Schema.Array(PostSummary),
  byTopic: Schema.Array(Schema.Array(PostSummary)),
  post: Schema.NullOr(Post),
  section: Schema.NullOr(SectionData),
  feature: Schema.NullOr(FeatureData),
  comments: Schema.Array(Comment),
  searchItems: Schema.Array(SearchItem),
})
export type Flags = typeof Flags.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  CompletedLoadPage: {},
  ClickedToggleTheme: {},
  CompletedApplyTheme: {},
  ClickedMenu: {},
  ClickedSearch: {},
  PressedSearchShortcut: {},
  PressedEscape: {},
  ClickedSearchBackdrop: {},
  UpdatedSearchQuery: { value: Schema.String },
  CompletedFocusSearch: {},
  UpdatedNewsletterEmail: { value: Schema.String },
  SubmittedNewsletter: {},
  ScrolledPage: {
    scrollY: Schema.Number,
    readingProgress: Schema.Number,
    maybeActiveHeadingId: Schema.Option(Schema.String),
    areCommentsVisible: Schema.Boolean,
  },
  ClickedBackToTop: {},
  CompletedScrollToTop: {},
  CompletedReadCookieConsent: { isDismissed: Schema.Boolean },
  ClickedDismissCookieBanner: {},
  CompletedStoreCookieConsent: {},
  ClickedLike: {},
  ClickedShare: {},
  ClickedCopyLink: {},
  CompletedCopyLink: {},
  ClickedCopyCode: {},
  CompletedCopyCode: {},
  UpdatedCommentDraft: { value: Schema.String },
  SubmittedComment: {},
  CompletedStampComment: { comment: Comment },
  SelectedTopic: { index: Schema.Number },
  SelectedBlogPage: { index: Schema.Number },
  ClickedFaq: { index: Schema.Number },
  UpdatedContactField: { field: ContactField, value: Schema.String },
  SubmittedContact: {},
  ChangedWidget: { id: Schema.String, msg: WidgetMsg },
})
export type Message = typeof Message.Type

// COMMAND

// NOTE: pages are statically generated with their data in Flags, so link
// navigation is a full document load (MPA style) rather than a client fetch.
const LoadPage = Command.define('LoadPage', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadPage],
  execute: ({ href }) => load(href).pipe(Effect.as(Message.CompletedLoadPage())),
})

const ApplyTheme = Command.define('ApplyTheme', {
  args: { theme: Theme },
  messages: [Message.CompletedApplyTheme],
  execute: ({ theme }) =>
    Effect.sync(() => {
      document.documentElement.dataset.theme = theme === 'Dark' ? 'dark' : 'light'
    }).pipe(Effect.as(Message.CompletedApplyTheme())),
})

const FocusSearch = Command.define('FocusSearch', {
  messages: [Message.CompletedFocusSearch],
  execute: focus('#search-input').pipe(
    Effect.as(Message.CompletedFocusSearch()),
    Effect.catch(() => Effect.succeed(Message.CompletedFocusSearch())),
  ),
})

const ScrollToTop = Command.define('ScrollToTop', {
  messages: [Message.CompletedScrollToTop],
  execute: Effect.sync(() => window.scrollTo({ top: 0 })).pipe(Effect.as(Message.CompletedScrollToTop())),
})

const COOKIE_CONSENT_KEY = 'cookie-consent'

const ReadCookieConsent = Command.define('ReadCookieConsent', {
  messages: [Message.CompletedReadCookieConsent],
  execute: Effect.sync(() =>
    Message.CompletedReadCookieConsent({ isDismissed: localStorage.getItem(COOKIE_CONSENT_KEY) !== null }),
  ),
})

const StoreCookieConsent = Command.define('StoreCookieConsent', {
  messages: [Message.CompletedStoreCookieConsent],
  execute: Effect.sync(() => localStorage.setItem(COOKIE_CONSENT_KEY, '1')).pipe(
    Effect.as(Message.CompletedStoreCookieConsent()),
  ),
})

const CopyLink = Command.define('CopyLink', {
  messages: [Message.CompletedCopyLink],
  execute: Effect.tryPromise(() => navigator.clipboard.writeText(location.href)).pipe(
    Effect.as(Message.CompletedCopyLink()),
    Effect.catch(() => Effect.succeed(Message.CompletedCopyLink())),
  ),
})

const CopyCode = Command.define('CopyCode', {
  args: { code: Schema.String },
  messages: [Message.CompletedCopyCode],
  execute: ({ code }) =>
    Effect.tryPromise(() => navigator.clipboard.writeText(code)).pipe(
      Effect.as(Message.CompletedCopyCode()),
      Effect.catch(() => Effect.succeed(Message.CompletedCopyCode())),
    ),
})

const StampComment = Command.define('StampComment', {
  args: { id: Schema.String, body: Schema.String },
  messages: [Message.CompletedStampComment],
  execute: ({ id, body }) =>
    Clock.currentTimeMillis.pipe(
      Effect.map(millis =>
        Message.CompletedStampComment({
          comment: { id, author: 'you', body, date: new Date(millis).toISOString().slice(0, 10) },
        }),
      ),
    ),
})

// INIT

export const init: Runtime.RoutingApplicationInit<Model, Message, Flags> = (flags, url) => ({
  model: {
    route: urlToAppRoute(url),
    summaries: flags.summaries,
    byTopic: flags.byTopic,
    maybePost: Option.fromNullOr(flags.post),
    maybeSection: Option.fromNullOr(flags.section),
    maybeFeature: Option.fromNullOr(flags.feature),
    widgets: {},
    comments: flags.comments,
    searchItems: flags.searchItems,
    theme: 'Light',
    isMenuOpen: false,
    isSearchOpen: false,
    searchQuery: '',
    newsletterEmail: '',
    newsletterStatus: 'Idle',
    scrollY: 0,
    readingProgress: 0,
    maybeActiveHeadingId: Option.none(),
    areCommentsVisible: false,
    isCookieBannerDismissed: false,
    likes: 0,
    isShareOpen: false,
    isLinkCopied: false,
    isCodeCopied: false,
    commentDraft: '',
    selectedTopic: 0,
    blogPage: 0,
    maybeOpenFaq: Option.some(0),
    contact: { name: '', email: '', message: '', errors: [], status: 'Idle' },
  },
  commands: [ReadCookieConsent()],
})

// UPDATE

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const contactErrors = (contact: Contact): ReadonlyArray<ContactField> =>
  ContactField.literals.filter(field => {
    if (field === 'name') {
      return contact.name.trim() === ''
    }
    if (field === 'email') {
      return !EMAIL_PATTERN.test(contact.email)
    }
    return contact.message.trim().length < 10
  })

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedLink: ({ request }) =>
      UrlRequest.match<UpdateReturn>(request, {
        Internal: ({ url }) => ({ model, commands: [LoadPage({ href: urlToString(url) })] }),
        External: ({ href }) => ({ model, commands: [LoadPage({ href })] }),
      }),
    ChangedUrl: ({ url }) => ({ model: modifyFields(model, { route: () => urlToAppRoute(url) }) }),
    CompletedLoadPage: () => ({ model }),
    ClickedToggleTheme: () => {
      const nextTheme: Theme = model.theme === 'Light' ? 'Dark' : 'Light'
      return {
        model: modifyFields(model, { theme: () => nextTheme }),
        commands: [ApplyTheme({ theme: nextTheme })],
      }
    },
    CompletedApplyTheme: () => ({ model }),
    ClickedMenu: () => ({ model: modifyFields(model, { isMenuOpen: isOpen => !isOpen }) }),
    ClickedSearch: () => ({
      model: modifyFields(model, { isSearchOpen: () => true, searchQuery: () => '' }),
      commands: [FocusSearch()],
    }),
    PressedSearchShortcut: () =>
      model.isSearchOpen
        ? { model: modifyFields(model, { isSearchOpen: () => false }) }
        : {
            model: modifyFields(model, { isSearchOpen: () => true, searchQuery: () => '' }),
            commands: [FocusSearch()],
          },
    PressedEscape: () => ({ model: modifyFields(model, { isSearchOpen: () => false }) }),
    ClickedSearchBackdrop: () => ({ model: modifyFields(model, { isSearchOpen: () => false }) }),
    UpdatedSearchQuery: ({ value }) => ({
      model: modifyFields(model, { searchQuery: () => value }),
    }),
    CompletedFocusSearch: () => ({ model }),
    UpdatedNewsletterEmail: ({ value }) => ({
      model: modifyFields(model, { newsletterEmail: () => value, newsletterStatus: () => 'Idle' as const }),
    }),
    SubmittedNewsletter: () => ({
      model: modifyFields(model, {
        newsletterStatus: () => (EMAIL_PATTERN.test(model.newsletterEmail) ? 'Submitted' : 'Invalid') as SubmitStatus,
      }),
    }),
    ScrolledPage: ({ scrollY, readingProgress, maybeActiveHeadingId, areCommentsVisible }) => ({
      model: modifyFields(model, {
        scrollY: () => scrollY,
        readingProgress: () => readingProgress,
        maybeActiveHeadingId: current => Option.orElse(maybeActiveHeadingId, () => current),
        areCommentsVisible: wereVisible => wereVisible || areCommentsVisible,
      }),
    }),
    ClickedBackToTop: () => ({ model, commands: [ScrollToTop()] }),
    CompletedScrollToTop: () => ({ model }),
    CompletedReadCookieConsent: ({ isDismissed }) => ({
      model: modifyFields(model, { isCookieBannerDismissed: () => isDismissed }),
    }),
    ClickedDismissCookieBanner: () => ({
      model: modifyFields(model, { isCookieBannerDismissed: () => true }),
      commands: [StoreCookieConsent()],
    }),
    CompletedStoreCookieConsent: () => ({ model }),
    ClickedLike: () => ({ model: modifyFields(model, { likes: likes => likes + 1 }) }),
    ClickedShare: () => ({ model: modifyFields(model, { isShareOpen: isOpen => !isOpen }) }),
    ClickedCopyLink: () => ({ model, commands: [CopyLink()] }),
    CompletedCopyLink: () => ({ model: modifyFields(model, { isLinkCopied: () => true }) }),
    ClickedCopyCode: () => {
      const code = Option.flatMap(model.maybePost, post =>
        Array.findFirst(post.blocks, block => (block.type === 'code' ? Option.some(block.text) : Option.none())),
      )
      return Option.match(code, {
        onNone: () => ({ model }),
        onSome: text => ({ model, commands: [CopyCode({ code: text })] }),
      })
    },
    CompletedCopyCode: () => ({ model: modifyFields(model, { isCodeCopied: () => true }) }),
    UpdatedCommentDraft: ({ value }) => ({ model: modifyFields(model, { commentDraft: () => value }) }),
    SubmittedComment: () =>
      model.commentDraft.trim() === ''
        ? { model }
        : {
            model: modifyFields(model, { commentDraft: () => '' }),
            commands: [StampComment({ id: `new-${model.comments.length}`, body: model.commentDraft })],
          },
    CompletedStampComment: ({ comment }) => ({
      model: modifyFields(model, { comments: comments => Array.append(comments, comment) }),
    }),
    SelectedTopic: ({ index }) => ({ model: modifyFields(model, { selectedTopic: () => index }) }),
    SelectedBlogPage: ({ index }) => ({ model: modifyFields(model, { blogPage: () => index }) }),
    ClickedFaq: ({ index }) => ({
      model: modifyFields(model, {
        maybeOpenFaq: maybeOpen =>
          Option.exists(maybeOpen, open => open === index) ? Option.none() : Option.some(index),
      }),
    }),
    UpdatedContactField: ({ field, value }) => ({
      model: modifyFields(model, { contact: contact => ({ ...contact, [field]: value }) }),
    }),
    SubmittedContact: () => {
      const errors = contactErrors(model.contact)
      return {
        model: modifyFields(model, {
          contact: contact => ({
            ...contact,
            errors,
            status: (errors.length === 0 ? 'Submitted' : 'Idle') as SubmitStatus,
          }),
        }),
      }
    },
    ChangedWidget: ({ id, msg }) => {
      const widget = widgets[id]
      return widget
        ? {
            model: modifyFields(model, {
              widgets: states => ({ ...states, [id]: widget.update(states[id] ?? widget.init, msg) }),
            }),
          }
        : { model }
    },
  })

// SUBSCRIPTION

const readScroll = (): Message => {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight
  const headings = Array.fromIterable(document.querySelectorAll<HTMLElement>('article h2[id]'))
  const activeZone = window.innerHeight * 0.3
  const comments = document.querySelector('section[aria-label="Comments"]')
  return Message.ScrolledPage({
    scrollY: window.scrollY,
    readingProgress: maxScroll > 0 ? Math.min(1, window.scrollY / maxScroll) : 0,
    maybeActiveHeadingId: Option.map(
      Array.findLast(headings, heading => heading.getBoundingClientRect().top < activeZone),
      heading => heading.id,
    ),
    areCommentsVisible: comments !== null && comments.getBoundingClientRect().top < window.innerHeight,
  })
}

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  scroll: entry(
    {},
    {
      modelToDependencies: () => ({}),
      dependenciesToStream: () =>
        Stream.concat(
          Stream.fromEffect(Effect.sync(readScroll)),
          streamFromEvent({ target: window, type: 'scroll', mapEvent: readScroll, options: { passive: true } }),
        ),
    },
  ),
  keyboard: entry(
    {},
    {
      modelToDependencies: () => ({}),
      dependenciesToStream: () =>
        streamFromEventFilterMap({
          target: window,
          type: 'keydown',
          filterMapEvent: event => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
              event.preventDefault()
              return Option.some(Message.PressedSearchShortcut())
            }
            return event.key === 'Escape' ? Option.some(Message.PressedEscape()) : Option.none()
          },
        }),
    },
  ),
}))
