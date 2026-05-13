import type {
  AssistantErrorKind,
  ChatMessage,
  Thread,
} from "@/lib/chat-types"

export const PLACEHOLDER_REPLY = "Response not connected."

export function filterPinsToExistingThreads(
  pinnedIds: string[],
  threads: Thread[],
): string[] {
  const ids = new Set(threads.map((t) => t.id))
  return pinnedIds.filter((id) => ids.has(id))
}

export function firstNonArchivedThreadId(
  threads: Thread[],
  archivedIds: ReadonlySet<string>,
): string {
  return threads.find((t) => !archivedIds.has(t.id))?.id ?? ""
}

export function nextActiveWhenArchivingCurrent(
  threads: Thread[],
  archivedIdsBefore: ReadonlySet<string>,
  archiveId: string,
  currentActiveId: string,
): string {
  if (currentActiveId !== archiveId) return currentActiveId
  const nextArchived = new Set(archivedIdsBefore)
  nextArchived.add(archiveId)
  return firstNonArchivedThreadId(threads, nextArchived)
}

export function nextActiveWhenDeletingCurrent(
  nextThreads: Thread[],
  deletedId: string,
  currentActiveId: string,
): string {
  if (currentActiveId !== deletedId) return currentActiveId
  return nextThreads[0]?.id ?? ""
}

export function mergePinAllInGroup(
  prevPinned: string[],
  groupIds: string[],
  existingThreadIds: Set<string>,
  maxPins: number,
): string[] {
  const valid = groupIds.filter((id) => existingThreadIds.has(id))
  const next = [...prevPinned]
  for (const id of valid) {
    if (next.includes(id)) continue
    if (next.length >= maxPins) break
    next.push(id)
  }
  return next
}

export function mergeUnpinAllInGroup(
  prevPinned: string[],
  groupIds: string[],
): string[] {
  const drop = new Set(groupIds)
  return prevPinned.filter((id) => !drop.has(id))
}

export function mapThreadsResolvePending(
  threads: Thread[],
  threadId: string,
  pendingId: string,
  content: string,
): Thread[] {
  return threads.map((t) => {
    if (t.id !== threadId) return t
    return {
      ...t,
      messages: t.messages.map((m) =>
        m.id === pendingId && m.type === "assistant-pending"
          ? { id: pendingId, type: "assistant" as const, content }
          : m,
      ),
    }
  })
}

export function appendMessagesToThread(
  threads: Thread[],
  activeThreadId: string,
  userMsg: ChatMessage,
  pending: ChatMessage,
): Thread[] {
  return threads.map((t) =>
    t.id === activeThreadId
      ? { ...t, messages: [...t.messages, userMsg, pending] }
      : t,
  )
}

export function buildThreadTitleFromUserText(trimmed: string): string {
  const collapsedTitle = trimmed.replace(/\s+/g, " ")
  if (collapsedTitle.length > 52) {
    return `${collapsedTitle.slice(0, 49).trimEnd()}…`
  }
  return collapsedTitle || "New chat"
}

/** First user message + pending assistant bubble for a brand-new thread. */
export function newThreadWithFirstUserExchange(args: {
  threadId: string
  userMessageId: string
  pendingMessageId: string
  userText: string
}): { thread: Thread; userMsg: ChatMessage; pendingId: string } {
  const userMsg: ChatMessage = {
    id: args.userMessageId,
    type: "user",
    content: args.userText,
  }
  const pending: ChatMessage = {
    id: args.pendingMessageId,
    type: "assistant-pending",
  }
  const title = buildThreadTitleFromUserText(args.userText)
  return {
    thread: { id: args.threadId, title, messages: [userMsg, pending] },
    userMsg,
    pendingId: args.pendingMessageId,
  }
}

export function renameThreadTitle(
  threads: Thread[],
  threadId: string,
  newTitle: string,
): Thread[] {
  return threads.map((t) => (t.id === threadId ? { ...t, title: newTitle } : t))
}

export function togglePinnedId(
  prevPinned: string[],
  id: string,
  maxPins: number,
): string[] {
  if (prevPinned.includes(id)) return prevPinned.filter((x) => x !== id)
  if (prevPinned.length >= maxPins) return prevPinned
  return [...prevPinned, id]
}

/** Append a streamed delta to the in-flight pending bubble. */
export function appendTokenToPending(
  threads: Thread[],
  threadId: string,
  pendingId: string,
  token: string,
): Thread[] {
  if (!token) return threads
  return threads.map((t) => {
    if (t.id !== threadId) return t
    return {
      ...t,
      messages: t.messages.map((m) =>
        m.id === pendingId && m.type === "assistant-pending"
          ? { ...m, content: (m.content ?? "") + token }
          : m,
      ),
    }
  })
}

/** Finalise a pending bubble into a complete assistant message. */
export function replacePendingWithAssistant(
  threads: Thread[],
  threadId: string,
  pendingId: string,
  finalText: string,
): Thread[] {
  return threads.map((t) => {
    if (t.id !== threadId) return t
    return {
      ...t,
      messages: t.messages.map((m) =>
        m.id === pendingId && m.type === "assistant-pending"
          ? { id: pendingId, type: "assistant" as const, content: finalText }
          : m,
      ),
    }
  })
}

export type PendingErrorInput = {
  kind: AssistantErrorKind
  message: string
  /** Partial assistant text accumulated before the failure, if any. */
  partial?: string
  canRetry?: boolean
}

/** Swap a pending bubble for an error bubble. */
export function replacePendingWithError(
  threads: Thread[],
  threadId: string,
  pendingId: string,
  err: PendingErrorInput,
): Thread[] {
  return threads.map((t) => {
    if (t.id !== threadId) return t
    return {
      ...t,
      messages: t.messages.map((m) =>
        m.id === pendingId && m.type === "assistant-pending"
          ? {
              id: pendingId,
              type: "assistant-error" as const,
              kind: err.kind,
              content: err.partial ?? m.content ?? "",
              canRetry: err.canRetry ?? err.kind !== "ratelimit",
              message: err.message,
            }
          : m,
      ),
    }
  })
}

/**
 * Validate an LLM-generated title. Rejects empty/multiline/over-long outputs
 * and obvious sentences so the heuristic title stays when the model fumbles.
 */
export function isValidLlmTitle(raw: string): boolean {
  const t = raw.trim()
  if (t.length === 0) return false
  if (t.length > 60) return false
  if (/[\n\r]/.test(t)) return false
  if (/[.!?]$/.test(t)) return false
  if (t.split(/\s+/).length > 10) return false
  return true
}

/**
 * Rename a thread only if its current title still matches the original
 * heuristic title — protects user-supplied names from being overwritten by
 * the background LLM rename.
 */
export function renameThreadIfHeuristic(
  threads: Thread[],
  threadId: string,
  newTitle: string,
  expectedHeuristicTitle: string,
): Thread[] {
  return threads.map((t) => {
    if (t.id !== threadId) return t
    if (t.title !== expectedHeuristicTitle) return t
    return { ...t, title: newTitle }
  })
}
