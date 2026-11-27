import { Effect } from 'effect'

/** Writes to the clipboard, and succeeds whether or not the browser allowed it. */
export const copyText = (text: () => string): Effect.Effect<void> =>
  Effect.promise(() => navigator.clipboard?.writeText(text()).catch(() => {}) ?? Promise.resolve())
