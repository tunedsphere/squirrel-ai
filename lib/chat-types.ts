export type AssistantErrorKind =
  | "network"
  | "ratelimit"
  | "provider"
  | "stopped"

/** Single quiz option shown to the learner (display order includes shuffled content + fixed “I don’t know”). */
export type QuizChoice = {
  text: string
  correct: boolean
}

/** One quiz step after shuffle + appended “I don’t know”. */
export type QuizQuestionState = {
  prompt: string
  pickCount: number
  choices: QuizChoice[]
}

export type QuizMessageStatus = "generating" | "in_progress" | "complete" | "error"

/** Inline quiz persisted at the bottom of the thread. */
export type QuizChatMessage = {
  id: string
  type: "quiz"
  status: QuizMessageStatus
  errorMessage?: string
  questions: QuizQuestionState[]
  currentIndex: number
  /** One entry per question; indices refer to `choices` display order. */
  answers: (number[] | null)[]
  /** Number correct out of 5 when `complete`. */
  scoreCorrect?: number
}

export type ChatImageAttachment = {
  id: string
  kind: "image"
  /** `data:` URL or `https:` */
  src: string
}

export type ChatMessage =
  | {
      id: string
      type: "user"
      content: string
      attachments?: readonly ChatImageAttachment[]
    }
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
  | QuizChatMessage

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
