export type AssistantErrorKind =
  | "network"
  | "ratelimit"
  | "provider"
  | "stopped"

export type ChatMessage =
  | { id: string; type: "user"; content: string }
  | { id: string; type: "assistant"; content: string }
  | { id: string; type: "assistant-pending"; content?: string }
  | {
      id: string
      type: "assistant-error"
      /** Partial assistant text accumulated before the failure, if any. */
      content: string
      kind: AssistantErrorKind
      /** Whether the user can retry / resume from this state. */
      canRetry: boolean
      /** Human-readable error to surface in the bubble. */
      message: string
    }

export type GroupingSource = "heuristic" | "server"

/** Optional persisted folder metadata (Tier B); Tier A uses `groupThreadsHeuristic` in `lib/group-threads.ts`. */
export type Thread = {
  id: string
  title: string
  messages: ChatMessage[]
  folderKey?: string
  folderTitle?: string
  groupingSource?: GroupingSource
  /** Per-thread system prompt override; wins over the layered defaults. */
  systemPrompt?: string
}
