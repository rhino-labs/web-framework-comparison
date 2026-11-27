import { Stream } from 'effect'

/** `read()` now, then again on every scroll of the window. */
export const onScroll = <A>(read: () => A): Stream.Stream<A> =>
  Stream.concat(
    Stream.sync(read),
    Stream.fromEventListener(window, 'scroll', { passive: true }).pipe(Stream.map(read)),
  )
