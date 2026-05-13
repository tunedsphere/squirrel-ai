/** Sync the `thread` query key with landing vs real thread ids (preserves other params). */
export function applyThreadIdToSearchParams(
  params: URLSearchParams,
  threadId: string,
  landingThreadId: string,
): void {
  if (threadId === landingThreadId) {
    params.delete("thread")
  } else {
    params.set("thread", threadId)
  }
}

/**
 * Path (+ query) for sharing or opening a thread: bare `pathname` on landing,
 * otherwise `?thread=<id>` only (no other query keys).
 */
export function pathForThreadDeepLink(
  pathname: string,
  threadId: string,
  landingThreadId: string,
): string {
  if (threadId === landingThreadId) return pathname
  return `${pathname}?${new URLSearchParams({ thread: threadId }).toString()}`
}
