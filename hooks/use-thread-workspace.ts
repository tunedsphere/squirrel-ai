"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import { MAX_PINS } from "@/lib/chat-constants"
import { groupThreadsHeuristic } from "@/lib/group-threads"
import type {
  AssistantErrorKind,
  ChatMessage,
  QuizChatMessage,
  Thread,
} from "@/lib/chat-types"
import {
  initialThreads,
  LANDING_THREAD_ID,
  MODELS,
  type ModelId,
} from "@/lib/mock-threads"
import {
  appendMessageToThread,
  appendMessagesToThread,
  appendTokenToPending,
  buildThreadTitleFromUserText,
  filterPinsToExistingThreads,
  isValidLlmTitle,
  mergePinAllInGroup,
  mergeUnpinAllInGroup,
  newThreadWithFirstUserExchange,
  nextActiveWhenArchivingCurrent,
  nextActiveWhenDeletingCurrent,
  renameThreadIfHeuristic,
  renameThreadTitle,
  replacePendingWithAssistant,
  replacePendingWithError,
  togglePinnedId,
} from "@/lib/thread-workspace-logic"
import {
  applyThreadIdToSearchParams,
  pathForThreadDeepLink,
} from "@/lib/thread-url"
import { threadToExportDraftMarkdown } from "@/lib/conversation-export-draft"
import { loadExportSettings } from "@/lib/conversation-export-settings"
import type { ConversationExportFormat } from "@/lib/conversation-export-settings"
import {
  downloadTextFile,
  sanitizeFilename,
  threadToMarkdown,
} from "@/lib/thread-export"

export type MainView = "chat" | "library"

export type UseThreadWorkspaceOptions = {
  composerTextareaRef: React.RefObject<HTMLTextAreaElement | null>
  /** Current `thread` query value from the URL (pass `useSearchParams().get("thread")` from a parent inside `Suspense`). */
  threadQuery: string | null
}

export function useThreadWorkspace({
  composerTextareaRef,
  threadQuery,
}: UseThreadWorkspaceOptions) {
  const router = useRouter()
  const pathname = usePathname()

  const [threads, setThreadsState] = React.useState<Thread[]>(initialThreads)
  const [activeThreadId, setActiveThreadId] = React.useState(
    () => initialThreads()[0]?.id ?? "",
  )
  const [mainView, setMainView] = React.useState<MainView>("chat")
  const [pinnedIds, setPinnedIds] = React.useState<string[]>([])
  const [archivedThreadIds, setArchivedThreadIds] = React.useState<string[]>([])
  const [threadDragActive, setThreadDragActive] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [modelId, setModelId] = React.useState<ModelId>(MODELS[0].id)
  const [draft, setDraft] = React.useState("")
  const [threadPendingDelete, setThreadPendingDelete] =
    React.useState<Thread | null>(null)
  const [streamInFlight, setStreamInFlight] = React.useState(false)
  /** Bumped only when the user submits a message (or retry) so the message column can scroll once—never on streaming tokens. */
  const [scrollEpoch, setScrollEpoch] = React.useState(0)
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false)
  const [exportDialogThreadId, setExportDialogThreadId] = React.useState<
    string | null
  >(null)
  const [exportConversationFormat, setExportConversationFormat] =
    React.useState<ConversationExportFormat>("pdf")
  const [exportStagingByThreadId, setExportStagingByThreadId] = React.useState<
    Record<string, string>
  >({})

  const [exportDialogSession, setExportDialogSession] = React.useState(0)

  const bumpScrollToLatest = React.useCallback(() => {
    setScrollEpoch((n) => n + 1)
  }, [])

  type QuizSessionSnapshot = {
    threadId: string
    messages: ChatMessage[]
  }

  const [quizSession, setQuizSession] =
    React.useState<QuizSessionSnapshot | null>(null)
  const [quizSessionKey, setQuizSessionKey] = React.useState(0)

  const closeQuizSession = React.useCallback(() => {
    setQuizSession(null)
  }, [])

  const completeQuizSession = React.useCallback(
    (threadId: string, msg: QuizChatMessage) => {
      setThreadsState((prev) =>
        appendMessageToThread(prev, threadId, msg),
      )
      bumpScrollToLatest()
      setQuizSession(null)
    },
    [bumpScrollToLatest],
  )

  const startQuizMe = React.useCallback(
    (thread: Thread) => {
      if (streamInFlight || quizSession != null) return
      setQuizSessionKey((n) => n + 1)
      setQuizSession({
        threadId: thread.id,
        messages: [...thread.messages],
      })
    },
    [quizSession, streamInFlight],
  )

  const workspaceAbortRef = React.useRef<AbortController | null>(null)
  /** Tracks which pending bubble the in-flight stream belongs to. */
  const streamingTargetRef = React.useRef<{
    threadId: string
    pendingId: string
  } | null>(null)
  const threadsRef = React.useRef(threads)
  const archivedRef = React.useRef(archivedThreadIds)

  React.useEffect(() => {
    threadsRef.current = threads
  }, [threads])

  React.useEffect(() => {
    archivedRef.current = archivedThreadIds
  }, [archivedThreadIds])

  const archivedSet = React.useMemo(
    () => new Set(archivedThreadIds),
    [archivedThreadIds],
  )

  const visibleThreads = React.useMemo(
    () => threads.filter((t) => !archivedSet.has(t.id)),
    [threads, archivedSet],
  )

  const libraryGroups = React.useMemo(
    () => groupThreadsHeuristic(visibleThreads),
    [visibleThreads],
  )

  const syncThreadToUrl = React.useCallback(
    (threadId: string) => {
      const raw =
        typeof window !== "undefined" ? window.location.search : ""
      const q = raw.startsWith("?") ? raw.slice(1) : raw
      const p = new URLSearchParams(q)
      applyThreadIdToSearchParams(p, threadId, LANDING_THREAD_ID)
      const qs = p.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router],
  )

  /** Clean `/` (no `?thread=`) maps to the in-memory landing row. */
  React.useEffect(() => {
    if (threadQuery) return
    React.startTransition(() => {
      setActiveThreadId(LANDING_THREAD_ID)
      setMainView("chat")
    })
  }, [threadQuery])

  /** Drop `?thread=thread-landing` so the landing stays a bare path. */
  React.useEffect(() => {
    if (threadQuery !== LANDING_THREAD_ID) return
    syncThreadToUrl(LANDING_THREAD_ID)
  }, [threadQuery, syncThreadToUrl])

  /**
   * Abort the in-flight stream (if any) and either retire the affected pending
   * bubble into an `assistant-error` (kind: "stopped") so it can be resumed,
   * or drop it when the thread itself is going away.
   */
  const cancelInFlight = React.useCallback(
    (
      opts: {
        reason: AssistantErrorKind
        message: string
        drop?: boolean
      } = { reason: "stopped", message: "[stopped by user]" },
    ) => {
      const ctrl = workspaceAbortRef.current
      const target = streamingTargetRef.current
      workspaceAbortRef.current = null
      streamingTargetRef.current = null
      if (ctrl) ctrl.abort()
      setStreamInFlight(false)
      if (!target || opts.drop) return
      setThreadsState((prev) =>
        replacePendingWithError(prev, target.threadId, target.pendingId, {
          kind: opts.reason,
          message: opts.message,
          canRetry: true,
        }),
      )
    },
    [],
  )

  /** Tear down any in-flight stream when the workspace unmounts. */
  React.useEffect(() => {
    return () => {
      workspaceAbortRef.current?.abort()
      workspaceAbortRef.current = null
      streamingTargetRef.current = null
    }
  }, [])

  const openChatThread = React.useCallback(
    (threadId: string) => {
      const target = streamingTargetRef.current
      if (target && target.threadId !== threadId) {
        cancelInFlight({
          reason: "stopped",
          message: "Stopped when you switched threads.",
        })
      }
      setActiveThreadId(threadId)
      setMainView("chat")
      syncThreadToUrl(threadId)
    },
    [cancelInFlight, syncThreadToUrl],
  )

  React.useEffect(() => {
    if (!threadQuery) return
    if (archivedSet.has(threadQuery)) return
    if (!threads.some((t) => t.id === threadQuery)) return
    React.startTransition(() => {
      setActiveThreadId(threadQuery)
      setMainView("chat")
    })
  }, [threadQuery, threads, archivedSet])

  const onThreadPinDragStart = React.useCallback(() => {
    setThreadDragActive(true)
  }, [])

  const onThreadPinDragEnd = React.useCallback(() => {
    setThreadDragActive(false)
  }, [])

  const pinAllInGroup = React.useCallback(
    (ids: string[]) => {
      const existing = new Set(threads.map((t) => t.id))
      setPinnedIds((prev) => mergePinAllInGroup(prev, ids, existing, MAX_PINS))
    },
    [threads],
  )

  const unpinAllInGroup = React.useCallback((ids: string[]) => {
    setPinnedIds((prev) => mergeUnpinAllInGroup(prev, ids))
  }, [])

  const setThreads = React.useCallback(
    (action: React.SetStateAction<Thread[]>) => {
      setThreadsState((prev) => {
        const next =
          typeof action === "function"
            ? (action as (p: Thread[]) => Thread[])(prev)
            : action
        setPinnedIds((p) => {
          const filtered = filterPinsToExistingThreads(p, next)
          return filtered.length === p.length ? p : filtered
        })
        return next
      })
    },
    [],
  )

  const filteredThreads = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return visibleThreads
    return visibleThreads.filter((t) => t.title.toLowerCase().includes(q))
  }, [visibleThreads, searchQuery])

  const shareThread = React.useCallback(
    async (thread: Thread) => {
      const origin =
        typeof window !== "undefined" ? window.location.origin : ""
      const path = pathForThreadDeepLink(
        pathname,
        thread.id,
        LANDING_THREAD_ID,
      )
      const url = `${origin}${path}`
      const text = `${thread.title}\n${url}`
      try {
        if (navigator.share) {
          await navigator.share({ title: thread.title, text, url })
          return
        }
      } catch {
        /* user cancelled or share unsupported */
      }
      try {
        await navigator.clipboard.writeText(text)
      } catch {
        /* ignore */
      }
    },
    [pathname],
  )

  const renameThread = React.useCallback(
    (thread: Thread) => {
      const next = window.prompt("Rename thread", thread.title)
      if (next == null) return
      const title = next.trim()
      if (!title || title === thread.title) return
      setThreads((prev) => renameThreadTitle(prev, thread.id, title))
    },
    [setThreads],
  )

  const archiveThread = React.useCallback(
    (id: string) => {
      const target = streamingTargetRef.current
      if (target && target.threadId === id) {
        cancelInFlight({
          reason: "stopped",
          message: "Stopped when you archived this thread.",
        })
      }
      setArchivedThreadIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
      setPinnedIds((p) => p.filter((x) => x !== id))
      setActiveThreadId((cur) =>
        nextActiveWhenArchivingCurrent(
          threadsRef.current,
          new Set(archivedRef.current),
          id,
          cur,
        ),
      )
    },
    [cancelInFlight],
  )

  const requestDeleteThread = React.useCallback((thread: Thread) => {
    setThreadPendingDelete(thread)
  }, [])

  const confirmDeleteThread = React.useCallback(() => {
    const thread = threadPendingDelete
    if (!thread) return
    const target = streamingTargetRef.current
    if (target && target.threadId === thread.id) {
      cancelInFlight({
        reason: "stopped",
        message: "Deleted mid-stream.",
        drop: true,
      })
    }
    setThreads((prev) => {
      const next = prev.filter((t) => t.id !== thread.id)
      setActiveThreadId((cur) =>
        nextActiveWhenDeletingCurrent(next, thread.id, cur),
      )
      return next
    })
    setArchivedThreadIds((p) => p.filter((x) => x !== thread.id))
    setThreadPendingDelete(null)
  }, [cancelInFlight, threadPendingDelete, setThreads])

  const togglePinThread = React.useCallback((id: string) => {
    setPinnedIds((prev) => togglePinnedId(prev, id, MAX_PINS))
  }, [])

  const openThreadInNewTab = React.useCallback(
    (threadId: string) => {
      const origin =
        typeof window !== "undefined" ? window.location.origin : ""
      const path = pathForThreadDeepLink(
        pathname,
        threadId,
        LANDING_THREAD_ID,
      )
      const url = `${origin}${path}`
      window.open(url, "_blank", "noopener,noreferrer")
    },
    [pathname],
  )

  const exportThreadMarkdown = React.useCallback((thread: Thread) => {
    const body = threadToMarkdown(thread)
    const name = `${sanitizeFilename(thread.title)}.md`
    downloadTextFile(name, body, "text/markdown;charset=utf-8")
  }, [])

  const openConversationExport = React.useCallback(
    (
      thread: Thread,
      format: ConversationExportFormat,
      opts?: { stagingMarkdown?: string },
    ) => {
      setExportDialogSession((n) => n + 1)
      setExportDialogThreadId(thread.id)
      setExportConversationFormat(format)
      setExportStagingByThreadId((prev) => {
        if (opts?.stagingMarkdown !== undefined) {
          return { ...prev, [thread.id]: opts.stagingMarkdown }
        }
        if (prev[thread.id] !== undefined) return prev
        return {
          ...prev,
          [thread.id]: threadToExportDraftMarkdown(thread, loadExportSettings()),
        }
      })
      setExportDialogOpen(true)
    },
    [],
  )

  const onExportDialogOpenChange = React.useCallback((open: boolean) => {
    setExportDialogOpen(open)
    if (!open) setExportDialogThreadId(null)
  }, [])

  const activeExportThread = React.useMemo(
    () => threads.find((t) => t.id === exportDialogThreadId) ?? null,
    [threads, exportDialogThreadId],
  )

  const conversationExportStaging =
    exportDialogThreadId != null
      ? (exportStagingByThreadId[exportDialogThreadId] ?? "")
      : ""

  const patchConversationExportStaging = React.useCallback(
    (threadId: string, updater: (prev: string) => string) => {
      setExportStagingByThreadId((prev) => {
        const cur = prev[threadId]
        if (cur === undefined) return prev
        return { ...prev, [threadId]: updater(cur) }
      })
    },
    [],
  )

  React.useEffect(() => {
    if (!exportDialogOpen || !exportDialogThreadId) return
    if (!threads.some((t) => t.id === exportDialogThreadId)) {
      setExportDialogOpen(false)
      setExportDialogThreadId(null)
    }
  }, [exportDialogOpen, exportDialogThreadId, threads])

  const activeThread = threads.find((t) => t.id === activeThreadId)
  const isEmptyChat =
    activeThread !== undefined && activeThread.messages.length === 0

  /** Background title generation. Skips silently if the user has renamed. */
  const generateBackgroundTitle = React.useCallback(
    async (args: {
      threadId: string
      heuristicTitle: string
      userText: string
      assistantText: string
    }) => {
      try {
        const res = await fetch("/api/chat/title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userText: args.userText,
            assistantText: args.assistantText,
          }),
        })
        if (!res.ok) return
        const payload = (await res.json()) as { title?: string }
        const candidate = payload.title?.trim() ?? ""
        if (!isValidLlmTitle(candidate)) return
        setThreads((prev) =>
          renameThreadIfHeuristic(
            prev,
            args.threadId,
            candidate,
            args.heuristicTitle,
          ),
        )
      } catch {
        /* network error: keep heuristic title silently */
      }
    },
    [setThreads],
  )

  /**
   * POST to /api/chat and pipe text-stream deltas into the pending bubble.
   * The caller has already appended `userMsg + pending` to the thread; we
   * forward the *pre-state-change* messages plus the user message so the
   * route receives the exact context regardless of React's flush timing.
   */
  const streamReply = React.useCallback(
    async (params: {
      threadId: string
      pendingId: string
      modelId: ModelId
      messagesToSend: ChatMessage[]
      systemPrompt?: string
      isFirstExchange: boolean
      heuristicTitle?: string
    }) => {
      const {
        threadId,
        pendingId,
        modelId: requestedModelId,
        messagesToSend,
        systemPrompt,
        isFirstExchange,
        heuristicTitle,
      } = params

      const ctrl = new AbortController()
      workspaceAbortRef.current = ctrl
      streamingTargetRef.current = { threadId, pendingId }
      setStreamInFlight(true)

      let accumulated = ""
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modelId: requestedModelId,
            thread: { id: threadId, systemPrompt },
            messages: messagesToSend,
          }),
          signal: ctrl.signal,
        })

        if (!res.ok) {
          let errPayload: { error?: string; message?: string } = {}
          try {
            errPayload = (await res.json()) as typeof errPayload
          } catch {
            /* ignore */
          }
          const isRateLimit = res.status === 429
          const isProviderUnconfigured =
            res.status === 503 && errPayload.error === "provider_not_configured"
          setThreads((prev) =>
            replacePendingWithError(prev, threadId, pendingId, {
              kind: isRateLimit
                ? "ratelimit"
                : isProviderUnconfigured
                  ? "provider"
                  : "provider",
              message:
                errPayload.message ??
                (isProviderUnconfigured
                  ? "AI Gateway not configured. See .env.example."
                  : `Request failed (${res.status}).`),
              canRetry: !isRateLimit,
            }),
          )
          return
        }

        const body = res.body
        if (!body) throw new Error("missing response body")
        const reader = body.getReader()
        const decoder = new TextDecoder()
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          if (!chunk) continue
          accumulated += chunk
          setThreads((prev) =>
            appendTokenToPending(prev, threadId, pendingId, chunk),
          )
        }

        setThreads((prev) =>
          replacePendingWithAssistant(prev, threadId, pendingId, accumulated),
        )

        if (isFirstExchange && heuristicTitle && accumulated.trim().length > 0) {
          const lastUser = [...messagesToSend]
            .reverse()
            .find((m) => m.type === "user")
          if (lastUser && lastUser.type === "user") {
            void generateBackgroundTitle({
              threadId,
              heuristicTitle,
              userText: lastUser.content,
              assistantText: accumulated,
            })
          }
        }
      } catch (err) {
        if (ctrl.signal.aborted) {
          // Abort handler (cancelInFlight) already updated the UI.
          return
        }
        setThreads((prev) =>
          replacePendingWithError(prev, threadId, pendingId, {
            kind: "network",
            message:
              err instanceof Error
                ? err.message
                : "Network error while contacting the model.",
            partial: accumulated,
            canRetry: true,
          }),
        )
      } finally {
        if (workspaceAbortRef.current === ctrl) {
          workspaceAbortRef.current = null
          streamingTargetRef.current = null
          setStreamInFlight(false)
        }
      }
    },
    [generateBackgroundTitle, setThreads],
  )

  const startNewChatWithFirstMessage = React.useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return

      const id = crypto.randomUUID()
      const userId = crypto.randomUUID()
      const pendingMessageId = crypto.randomUUID()
      const { thread, userMsg, pendingId } = newThreadWithFirstUserExchange({
        threadId: id,
        userMessageId: userId,
        pendingMessageId,
        userText: trimmed,
      })
      const title = thread.title

      cancelInFlight({
        reason: "stopped",
        message: "Stopped when you started a new chat.",
      })

      setThreads((prev) => [thread, ...prev])
      setActiveThreadId(id)
      setMainView("chat")
      setDraft("")
      setSearchQuery("")
      syncThreadToUrl(id)

      bumpScrollToLatest()

      void streamReply({
        threadId: id,
        pendingId,
        modelId,
        messagesToSend: [userMsg],
        isFirstExchange: true,
        heuristicTitle: title,
      })
    },
    [bumpScrollToLatest, cancelInFlight, modelId, setThreads, streamReply, syncThreadToUrl],
  )

  const handleSend = React.useCallback(() => {
    const text = draft.trim()
    if (!text || !activeThreadId) return
    setDraft("")

    cancelInFlight({
      reason: "stopped",
      message: "Stopped when you sent a new message.",
    })

    if (activeThreadId === LANDING_THREAD_ID) {
      const id = crypto.randomUUID()
      const userId = crypto.randomUUID()
      const pendingMessageId = crypto.randomUUID()
      const { thread, userMsg, pendingId } = newThreadWithFirstUserExchange({
        threadId: id,
        userMessageId: userId,
        pendingMessageId,
        userText: text,
      })
      const title = thread.title
      setThreads((prev) => [thread, ...prev])
      setActiveThreadId(id)
      syncThreadToUrl(id)

      bumpScrollToLatest()

      void streamReply({
        threadId: id,
        pendingId,
        modelId,
        messagesToSend: [userMsg],
        isFirstExchange: true,
        heuristicTitle: title,
      })
      return
    }

    const userId = crypto.randomUUID()
    const pendingId = crypto.randomUUID()
    const userMsg: ChatMessage = {
      id: userId,
      type: "user",
      content: text,
    }
    const pending: ChatMessage = { id: pendingId, type: "assistant-pending" }

    const currentThread = threadsRef.current.find(
      (t) => t.id === activeThreadId,
    )
    const priorMessages = currentThread?.messages ?? []
    const messagesToSend: ChatMessage[] = [...priorMessages, userMsg]
    const isFirstExchange = priorMessages.length === 0
    const heuristicTitle = isFirstExchange
      ? buildThreadTitleFromUserText(text)
      : undefined

    setThreads((prev) =>
      appendMessagesToThread(prev, activeThreadId, userMsg, pending),
    )

    bumpScrollToLatest()

    void streamReply({
      threadId: activeThreadId,
      pendingId,
      modelId,
      messagesToSend,
      systemPrompt: currentThread?.systemPrompt,
      isFirstExchange,
      heuristicTitle,
    })
  }, [
    activeThreadId,
    bumpScrollToLatest,
    cancelInFlight,
    draft,
    modelId,
    setThreads,
    streamReply,
    syncThreadToUrl,
  ])

  const stopStream = React.useCallback(() => {
    cancelInFlight({ reason: "stopped", message: "[stopped by user]" })
  }, [cancelInFlight])

  /**
   * Re-stream the assistant response that ended in an error/stopped bubble.
   * Drops the failed bubble, appends a fresh pending, and calls the model
   * again with the same prior context.
   */
  const retryFromError = React.useCallback(
    (threadId: string, errorMessageId: string) => {
      const thread = threadsRef.current.find((t) => t.id === threadId)
      if (!thread) return
      const errIdx = thread.messages.findIndex((m) => m.id === errorMessageId)
      if (errIdx === -1) return
      const errMsg = thread.messages[errIdx]
      if (errMsg.type !== "assistant-error") return

      const priorMessages = thread.messages.slice(0, errIdx)
      const hasPriorUser = priorMessages.some((m) => m.type === "user")
      if (!hasPriorUser) return

      cancelInFlight({
        reason: "stopped",
        message: "Stopped to retry the previous reply.",
      })

      const pendingId = crypto.randomUUID()
      const pending: ChatMessage = { id: pendingId, type: "assistant-pending" }

      setThreads((prev) =>
        prev.map((t) =>
          t.id !== threadId
            ? t
            : {
                ...t,
                messages: [...priorMessages, pending],
              },
        ),
      )

      bumpScrollToLatest()

      void streamReply({
        threadId,
        pendingId,
        modelId,
        messagesToSend: priorMessages,
        systemPrompt: thread.systemPrompt,
        isFirstExchange: false,
      })
    },
    [bumpScrollToLatest, cancelInFlight, modelId, setThreads, streamReply],
  )

  const onComposerKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const canSendMessage = Boolean(activeThreadId) && draft.trim().length > 0
  const sendButtonTooltip = !activeThreadId
    ? "Select a thread to send a message"
    : draft.trim().length === 0
      ? "Message requires text to send"
      : "Send message"

  const newChat = React.useCallback(() => {
    if (isEmptyChat && activeThreadId) {
      setMainView("chat")
      setDraft("")
      setSearchQuery("")
      syncThreadToUrl(activeThreadId)
      window.requestAnimationFrame(() => {
        composerTextareaRef.current?.focus()
      })
      return
    }
    const id = crypto.randomUUID()
    const thread: Thread = { id, title: "New chat", messages: [] }
    setThreads((prev) => [thread, ...prev])
    setActiveThreadId(id)
    setMainView("chat")
    setDraft("")
    setSearchQuery("")
    syncThreadToUrl(id)
  }, [
    activeThreadId,
    composerTextareaRef,
    isEmptyChat,
    setThreads,
    syncThreadToUrl,
  ])

  const dismissDeleteDialog = React.useCallback(() => {
    setThreadPendingDelete(null)
  }, [])

  return {
    threads,
    activeThreadId,
    mainView,
    setMainView,
    pinnedIds,
    setPinnedIds,
    threadDragActive,
    onThreadPinDragStart,
    onThreadPinDragEnd,
    searchQuery,
    setSearchQuery,
    modelId,
    setModelId,
    draft,
    setDraft,
    threadPendingDelete,
    dismissDeleteDialog,
    libraryGroups,
    filteredThreads,
    activeThread,
    isEmptyChat,
    openChatThread,
    pinAllInGroup,
    unpinAllInGroup,
    shareThread,
    renameThread,
    archiveThread,
    requestDeleteThread,
    confirmDeleteThread,
    togglePinThread,
    openThreadInNewTab,
    exportThreadMarkdown,
    openConversationExport,
    exportDialogOpen,
    exportDialogSession,
    onExportDialogOpenChange,
    exportConversationFormat,
    activeExportThread,
    conversationExportStaging,
    patchConversationExportStaging,
    exportDialogThreadId,
    startNewChatWithFirstMessage,
    handleSend,
    stopStream,
    streamInFlight,
    scrollEpoch,
    retryFromError,
    onComposerKeyDown,
    canSendMessage,
    sendButtonTooltip,
    newChat,
    startQuizMe,
    quizSession,
    quizSessionKey,
    closeQuizSession,
    completeQuizSession,
  }
}
