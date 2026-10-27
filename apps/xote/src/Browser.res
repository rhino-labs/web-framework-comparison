// Small DOM bindings used by the interactive components.

let targetValue: Dom.event => string = %raw(`e => e.target.value`)
let preventDefault: Dom.event => unit = %raw(`e => e.preventDefault()`)
let stopPropagation: Dom.event => unit = %raw(`e => e.stopPropagation()`)

let setTheme: bool => unit = %raw(`dark => { document.documentElement.dataset.theme = dark ? 'dark' : 'light' }`)
let scrollY: unit => float = %raw(`() => window.scrollY`)
let scrollToTop: unit => unit = %raw(`() => window.scrollTo({ top: 0 })`)
let scrollProgress: unit => float = %raw(`() => {
  const max = document.documentElement.scrollHeight - window.innerHeight
  return max > 0 ? Math.min(1, window.scrollY / max) : 0
}`)
let getStorage: string => option<string> = %raw(`key => localStorage.getItem(key) ?? undefined`)
let setStorage: (string, string) => unit = %raw(`(key, value) => localStorage.setItem(key, value)`)
let copyText: string => promise<unit> = %raw(`text => navigator.clipboard?.writeText(text).catch(() => {}) ?? Promise.resolve()`)
let locationHref: unit => string = %raw(`() => location.href`)
let today: unit => string = %raw(`() => new Date().toISOString().slice(0, 10)`)
let focusById: string => unit = %raw(`id => queueMicrotask(() => document.getElementById(id)?.focus())`)

/** Adds a window listener; returns the cleanup for Effect.run. */
let onWindow: (string, Dom.event => unit) => option<unit => unit> = %raw(`(type, listener) => {
  window.addEventListener(type, listener, { passive: type === 'scroll' })
  return () => window.removeEventListener(type, listener)
}`)

/** Keyboard shortcut: ⌘K/Ctrl+K toggles, Escape closes. */
let searchKey: Dom.event => [#Toggle | #Close | #None] = %raw(`e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); return 'Toggle' }
  return e.key === 'Escape' ? 'Close' : 'None'
}`)

/** Calls back with the id of the heading entering the top 30% of the viewport. */
let observeHeadings: (array<string>, string => unit) => option<unit => unit> = %raw(`(ids, onActive) => {
  const observer = new IntersectionObserver(entries => {
    const visible = entries.find(e => e.isIntersecting)
    if (visible) onActive(visible.target.id)
  }, { rootMargin: '0px 0px -70% 0px' })
  for (const id of ids) { const el = document.getElementById(id); if (el) observer.observe(el) }
  return () => observer.disconnect()
}`)

/** Calls back once the element matching the selector scrolls into view. */
let onVisible: (string, unit => unit) => option<unit => unit> = %raw(`(selector, callback) => {
  const el = document.querySelector(selector)
  if (!el) return undefined
  const observer = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting) { callback(); observer.disconnect() }
  })
  observer.observe(el)
  return () => observer.disconnect()
}`)

let emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
let isEmail = (s: string) => emailPattern->RegExp.test(s)

/** An effect that touches the DOM: component effects also run during server
 rendering, so this one only runs in the browser. */
let clientEffect = (body: unit => option<unit => unit>) =>
  Effect.run(() => SSRContext.isClient ? body() : None)
