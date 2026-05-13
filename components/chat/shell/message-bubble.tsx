"use client"

import * as React from "react"
import {
  AlertTriangle,
  Check,
  Copy,
  GripVertical,
  LogIn,
  RotateCcw,
} from "lucide-react"

import { AssistantMarkdown } from "@/components/chat/shell/assistant-markdown"
import { QuizMessage } from "@/components/chat/quiz"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { ChatMessage } from "@/lib/chat-types"
import { EXPORT_CLIP_DRAG_MIME, attachExportClipDragPreviewImage } from "@/lib/conversation-export-clip"
import { cn } from "@/lib/utils"

const assistantBubbleSurface = cn(
  "rounded-3xl bg-muted/40 px-5 py-5 sm:px-6 sm:py-6 dark:bg-muted/18",
)

const assistantBubbleTypography = cn(
  "text-base leading-[1.7] tracking-wide text-foreground/88 dark:text-foreground/76",
)

const assistantBubbleClass = cn(
  "w-full max-w-3xl",
  assistantBubbleSurface,
  assistantBubbleTypography,
)

/** Copy + clip row: when PDF dock is on, stay pointer-active so grip is draggable without hovering the bubble first */
function messageCopyRowClass(clipDockActive: boolean) {
  return cn(
    "flex w-full items-center justify-end gap-0.5 pt-0.5 transition-opacity duration-150 motion-reduce:transition-none",
    clipDockActive
      ? "pointer-events-auto opacity-[0.78] hover:opacity-100 group-hover/msg:opacity-100"
      : cn(
          "pointer-events-none opacity-0",
          "group-hover/msg:pointer-events-auto group-hover/msg:opacity-100",
          "group-focus-within/msg:pointer-events-auto group-focus-within/msg:opacity-100",
        ),
  )
}

const selectableBubbleFallback = cn("cursor-text select-text")

/** Extra px around selection geometry so grab cursor / drag intent are easier to hit */
const SELECTION_HIT_PADDING_PX = 14

function pointerHitTestsSelection(
  root: HTMLElement,
  clientX: number,
  clientY: number,
): boolean {
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || !sel.rangeCount) return false
  const range = sel.getRangeAt(0)
  let ancestor: Node | null = range.commonAncestorContainer
  if (ancestor.nodeType === Node.TEXT_NODE) ancestor = ancestor.parentElement
  if (!ancestor || !(ancestor instanceof Element) || !root.contains(ancestor)) {
    return false
  }

  const pad = SELECTION_HIT_PADDING_PX

  const union = range.getBoundingClientRect()
  if (union.width > 0 || union.height > 0) {
    if (
      clientX >= union.left - pad &&
      clientX <= union.right + pad &&
      clientY >= union.top - pad &&
      clientY <= union.bottom + pad
    ) {
      return true
    }
  }

  const rects = range.getClientRects()
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i]
    if (rect.width < 1 && rect.height < 1) continue
    if (
      clientX >= rect.left - pad &&
      clientX <= rect.right + pad &&
      clientY >= rect.top - pad &&
      clientY <= rect.bottom + pad
    ) {
      return true
    }
  }
  return false
}

/** `cursor-grab` over highlighted text in this bubble when PDF clip dock is active; idle uses `cursor-text`. */
function useGrabCursorOverSelection(
  rootRef: React.RefObject<HTMLElement | null>,
  clipInteractionEnabled: boolean,
): {
  bubbleCursorClass: string
  bubbleCursorHandlers: Pick<
    React.HTMLAttributes<HTMLElement>,
    "onMouseMove" | "onMouseLeave"
  >
} {
  const [overSelection, setOverSelection] = React.useState(false)

  const onMouseMove = React.useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!clipInteractionEnabled) return
      const root = rootRef.current
      if (!root) return
      const next = pointerHitTestsSelection(root, e.clientX, e.clientY)
      setOverSelection((prev) => (prev === next ? prev : next))
    },
    [clipInteractionEnabled, rootRef],
  )

  const onMouseLeave = React.useCallback(() => setOverSelection(false), [])

  React.useEffect(() => {
    if (!clipInteractionEnabled) {
      setOverSelection(false)
      return
    }
    const onSelChange = () => {
      const root = rootRef.current
      const sel = window.getSelection()
      if (!root || !sel || sel.isCollapsed || !sel.rangeCount) {
        setOverSelection(false)
        return
      }
      const range = sel.getRangeAt(0)
      let node: Node | null = range.commonAncestorContainer
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
      if (!node || !(node instanceof Element) || !root.contains(node)) {
        setOverSelection(false)
      }
    }
    document.addEventListener("selectionchange", onSelChange)
    return () => document.removeEventListener("selectionchange", onSelChange)
  }, [clipInteractionEnabled, rootRef])

  if (!clipInteractionEnabled) {
    return {
      bubbleCursorClass: selectableBubbleFallback,
      bubbleCursorHandlers: {},
    }
  }

  return {
    bubbleCursorClass: cn(
      "select-text",
      overSelection ? "cursor-grab" : "cursor-text",
    ),
    bubbleCursorHandlers: { onMouseMove, onMouseLeave },
  }
}

/**
 * Lets users click/drag from the highlighted region (not only the grip): temporarily sets
 * `draggable` on the bubble after pointerdown over the padded selection so HTML5 drag carries
 * EXPORT_CLIP_DRAG_MIME + plain text.
 */
function useBubbleSelectionClipDrag(
  bubbleRootRef: React.RefObject<HTMLElement | null>,
  clipRoleLabel: string,
  enabled: boolean,
): Pick<
  React.HTMLAttributes<HTMLElement>,
  "onPointerDownCapture" | "onDragStart" | "onDragEnd"
> {
  const excerptSnapshotRef = React.useRef<string | null>(null)
  const dragStartedRef = React.useRef(false)
  const docPointerEndRef = React.useRef<((_ev: PointerEvent) => void) | null>(null)

  const detachDocPointerListeners = React.useCallback(() => {
    const fn = docPointerEndRef.current
    if (!fn) return
    document.removeEventListener("pointerup", fn, true)
    document.removeEventListener("pointercancel", fn, true)
    docPointerEndRef.current = null
  }, [])

  const disarmBubble = React.useCallback(() => {
    detachDocPointerListeners()
    excerptSnapshotRef.current = null
    dragStartedRef.current = false
    bubbleRootRef.current?.removeAttribute("draggable")
  }, [bubbleRootRef, detachDocPointerListeners])

  React.useEffect(() => {
    if (!enabled) disarmBubble()
  }, [enabled, disarmBubble])

  const onPointerDownCapture = React.useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!enabled || !clipRoleLabel) return
      const root = bubbleRootRef.current
      if (!root) return

      const target = e.target as HTMLElement | null
      if (
        target?.closest(
          'button, input, textarea, select, [role="button"]',
        )
      ) {
        return
      }

      if (!pointerHitTestsSelection(root, e.clientX, e.clientY)) return

      const sel = window.getSelection()
      if (!sel?.rangeCount) return
      const range = sel.getRangeAt(0)
      if (!root.contains(range.commonAncestorContainer)) return
      const text = sel.toString().trim()
      if (!text) return

      detachDocPointerListeners()

      excerptSnapshotRef.current = text
      dragStartedRef.current = false
      root.setAttribute("draggable", "true")

      const onDocPointerEnd = (_ev: PointerEvent) => {
        detachDocPointerListeners()
        queueMicrotask(() => {
          if (!dragStartedRef.current) {
            excerptSnapshotRef.current = null
            bubbleRootRef.current?.removeAttribute("draggable")
          }
        })
      }
      docPointerEndRef.current = onDocPointerEnd
      document.addEventListener("pointerup", onDocPointerEnd, true)
      document.addEventListener("pointercancel", onDocPointerEnd, true)
    },
    [
      enabled,
      clipRoleLabel,
      bubbleRootRef,
      detachDocPointerListeners,
    ],
  )

  const onDragStart = React.useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      if (!enabled || !clipRoleLabel) {
        e.preventDefault()
        disarmBubble()
        return
      }

      const root = bubbleRootRef.current
      let text = excerptSnapshotRef.current?.trim() ?? ""
      excerptSnapshotRef.current = null

      if (!text && root) {
        const sel = window.getSelection()
        if (sel?.rangeCount) {
          const range = sel.getRangeAt(0)
          if (root.contains(range.commonAncestorContainer)) {
            text = sel.toString().trim()
          }
        }
      }

      if (!text) {
        e.preventDefault()
        disarmBubble()
        return
      }

      dragStartedRef.current = true
      e.dataTransfer.setData("text/plain", text)
      e.dataTransfer.setData(
        EXPORT_CLIP_DRAG_MIME,
        JSON.stringify({ role: clipRoleLabel, excerpt: text }),
      )
      e.dataTransfer.effectAllowed = "copy"
      attachExportClipDragPreviewImage(e.dataTransfer, {
        excerpt: text,
        role: clipRoleLabel,
      })
    },
    [enabled, clipRoleLabel, bubbleRootRef, disarmBubble],
  )

  const onDragEnd = React.useCallback(() => {
    disarmBubble()
  }, [disarmBubble])

  if (!enabled || !clipRoleLabel) {
    return {}
  }

  return {
    onPointerDownCapture,
    onDragStart,
    onDragEnd,
  }
}

function clipExportRoleLabel(message: ChatMessage): string {
  switch (message.type) {
    case "user":
      return "User"
    case "quiz":
      return "Quiz"
    case "assistant":
    case "assistant-pending":
    case "assistant-error":
      return "Assistant"
    default:
      return ""
  }
}

function ExportClipDragHandle({
  bubbleRootRef,
  clipRoleLabel,
  enabled,
}: {
  bubbleRootRef: React.RefObject<HTMLElement | null>
  clipRoleLabel: string
  enabled: boolean
}) {
  /** Mousedown on the grip clears selection before `dragstart`; capture text here first. */
  const excerptSnapshotRef = React.useRef<string | null>(null)

  const snapshotSelection = React.useCallback(() => {
    excerptSnapshotRef.current = null
    const root = bubbleRootRef.current
    if (!root) return
    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    const range = sel.getRangeAt(0)
    if (!root.contains(range.commonAncestorContainer)) return
    const text = sel.toString().trim()
    if (text) excerptSnapshotRef.current = text
  }, [bubbleRootRef])

  const clearSnapshot = React.useCallback(() => {
    excerptSnapshotRef.current = null
  }, [])

  const onDragStart = (e: React.DragEvent<HTMLButtonElement>) => {
    const root = bubbleRootRef.current
    let text = excerptSnapshotRef.current?.trim() ?? ""
    excerptSnapshotRef.current = null

    if (!text && root) {
      const sel = window.getSelection()
      if (sel?.rangeCount) {
        const range = sel.getRangeAt(0)
        if (root.contains(range.commonAncestorContainer)) {
          text = sel.toString().trim()
        }
      }
    }

    if (!text || !clipRoleLabel) {
      e.preventDefault()
      return
    }

    e.dataTransfer.setData("text/plain", text)
    e.dataTransfer.setData(
      EXPORT_CLIP_DRAG_MIME,
      JSON.stringify({ role: clipRoleLabel, excerpt: text }),
    )
    e.dataTransfer.effectAllowed = "copy"
    attachExportClipDragPreviewImage(e.dataTransfer, {
      excerpt: text,
      role: clipRoleLabel,
    })
  }

  if (!enabled || !clipRoleLabel) return null

  return (
    <button
      type="button"
      draggable
      onPointerDownCapture={snapshotSelection}
      onDragStart={onDragStart}
      onDragEnd={clearSnapshot}
      onPointerCancel={clearSnapshot}
      title="Select text in the message, then drag from this grip to Dock action"
      aria-label="Drag selected text to Dock action"
      className={cn(
        "inline-flex size-8 shrink-0 touch-none items-center justify-center rounded-md",
        "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
        "cursor-grab active:cursor-grabbing",
        "select-none outline-none",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
      )}
    >
      <GripVertical className="pointer-events-none size-3.5" aria-hidden />
    </button>
  )
}

function MessageCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false)

  const onCopy = async () => {
    const t = text.trim()
    if (!t) return
    try {
      await navigator.clipboard.writeText(t)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard can fail in locked-down contexts */
    }
  }

  const empty = !text.trim()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground"
          disabled={empty}
          onClick={onCopy}
          aria-label={copied ? "Copied to clipboard" : "Copy message"}
        >
          {copied ? (
            <Check className="size-3.5" aria-hidden />
          ) : (
            <Copy className="size-3.5" aria-hidden />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {copied ? "Copied" : "Copy message"}
      </TooltipContent>
    </Tooltip>
  )
}

function AssistantThinkingDots() {
  return (
    <div
      className={cn(
        assistantBubbleClass,
        "flex min-h-[3.25rem] items-center gap-2",
      )}
      aria-label="Assistant is thinking"
      role="status"
    >
      <span className="flex items-center gap-1.5 px-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-2 rounded-full bg-primary/55 animate-bounce [animation-duration:0.65s]"
            style={{ animationDelay: `${i * 0.14}s` }}
          />
        ))}
      </span>
    </div>
  )
}

function UserMessageBubble({
  content,
  exportClipDragEnabled,
}: {
  content: string
  exportClipDragEnabled: boolean
}) {
  const bubbleRef = React.useRef<HTMLDivElement>(null)
  const { bubbleCursorClass, bubbleCursorHandlers } = useGrabCursorOverSelection(
    bubbleRef,
    exportClipDragEnabled,
  )
  const bubbleClipDrag = useBubbleSelectionClipDrag(bubbleRef, "User", exportClipDragEnabled)

  return (
    <div className="flex justify-end">
      <div className="group/msg inline-flex max-w-[min(75%,28rem)] min-w-0 flex-col items-stretch">
        <div
          ref={bubbleRef}
          {...bubbleCursorHandlers}
          {...bubbleClipDrag}
          className={cn(
            "rounded-2xl bg-sidebar px-3 py-2.5 text-sm text-sidebar-foreground sm:px-4 sm:py-3",
            "text-pretty leading-relaxed tracking-wide",
            bubbleCursorClass,
          )}
        >
          {content}
        </div>
        <div className={messageCopyRowClass(exportClipDragEnabled)}>
          <ExportClipDragHandle
            bubbleRootRef={bubbleRef}
            clipRoleLabel="User"
            enabled={exportClipDragEnabled}
          />
          <MessageCopyButton text={content} />
        </div>
      </div>
    </div>
  )
}

function AssistantPendingMessageBubble({
  message,
  exportClipDragEnabled,
}: {
  message: Extract<ChatMessage, { type: "assistant-pending" }>
  exportClipDragEnabled: boolean
}) {
  const streamed = message.content?.length ? message.content : null
  const bubbleRef = React.useRef<HTMLDivElement>(null)
  const clipRole = clipExportRoleLabel(message)
  const { bubbleCursorClass, bubbleCursorHandlers } = useGrabCursorOverSelection(
    bubbleRef,
    exportClipDragEnabled,
  )
  const bubbleClipDrag = useBubbleSelectionClipDrag(
    bubbleRef,
    clipRole,
    exportClipDragEnabled && Boolean(clipRole),
  )

  return (
    <div className="flex justify-start">
      {streamed ? (
        <div className="group/msg inline-flex max-w-3xl min-w-0 flex-col items-stretch">
          <div
            ref={bubbleRef}
            {...bubbleCursorHandlers}
            {...bubbleClipDrag}
            className={cn(
              "relative min-w-0 max-w-3xl",
              assistantBubbleSurface,
              assistantBubbleTypography,
              bubbleCursorClass,
            )}
          >
            <AssistantMarkdown content={streamed} />
            <span
              className="ml-0.5 inline-block h-4 w-1.5 translate-y-px animate-pulse rounded-[1px] bg-primary/50 align-middle"
              aria-hidden
            />
          </div>
          <div className={messageCopyRowClass(exportClipDragEnabled && Boolean(clipRole))}>
            <ExportClipDragHandle
              bubbleRootRef={bubbleRef}
              clipRoleLabel={clipRole}
              enabled={exportClipDragEnabled && Boolean(clipRole)}
            />
            <MessageCopyButton text={streamed} />
          </div>
        </div>
      ) : (
        <AssistantThinkingDots />
      )}
    </div>
  )
}

function AssistantErrorMessageBubble({
  message,
  onRetry,
  exportClipDragEnabled,
}: {
  message: Extract<ChatMessage, { type: "assistant-error" }>
  onRetry?: (messageId: string) => void
  exportClipDragEnabled: boolean
}) {
  const bubbleRef = React.useRef<HTMLDivElement>(null)
  const clipRole = clipExportRoleLabel(message)
  const { bubbleCursorClass, bubbleCursorHandlers } = useGrabCursorOverSelection(
    bubbleRef,
    exportClipDragEnabled,
  )
  const bubbleClipDrag = useBubbleSelectionClipDrag(
    bubbleRef,
    clipRole,
    exportClipDragEnabled && Boolean(clipRole),
  )
  const isRateLimit = message.kind === "ratelimit"
  const isStopped = message.kind === "stopped"
  const retryLabel = isStopped ? "Resume" : "Retry"

  return (
    <div className="flex justify-start">
      <div className="group/msg inline-flex max-w-3xl min-w-0 flex-col items-stretch">
        <div
          ref={bubbleRef}
          {...bubbleCursorHandlers}
          {...bubbleClipDrag}
          className={cn(
            "min-w-0 max-w-3xl rounded-2xl border px-4 py-4 text-base sm:px-5 sm:py-5",
            isRateLimit
              ? "border-amber-300/60 bg-amber-50/60 text-amber-900 dark:border-amber-400/40 dark:bg-amber-950/30 dark:text-amber-100"
              : "border-destructive/40 bg-destructive/5 text-foreground",
            bubbleCursorClass,
          )}
          role="status"
        >
          {message.content ? (
            <div className="text-foreground/90 mb-3 select-text leading-relaxed">
              <AssistantMarkdown content={message.content} />
            </div>
          ) : null}
          <div className="flex items-start gap-2">
            <AlertTriangle
              className={cn(
                "size-4 shrink-0 translate-y-0.5",
                isRateLimit ? "text-amber-700 dark:text-amber-300" : "text-destructive",
              )}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium leading-relaxed">{message.message}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {message.canRetry && onRetry ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 px-2.5 text-xs"
                    onClick={() => onRetry(message.id)}
                  >
                    <RotateCcw className="size-3.5" aria-hidden />
                    {retryLabel}
                  </Button>
                ) : null}
                {isRateLimit ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1.5 px-2.5 text-xs"
                    disabled
                    title="Sign-in lands in a future milestone"
                  >
                    <LogIn className="size-3.5" aria-hidden />
                    Sign in to unlock more
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <div className={messageCopyRowClass(exportClipDragEnabled && Boolean(clipRole))}>
          <ExportClipDragHandle
            bubbleRootRef={bubbleRef}
            clipRoleLabel={clipRole}
            enabled={exportClipDragEnabled && Boolean(clipRole)}
          />
          <MessageCopyButton
            text={[message.content, message.message].filter(Boolean).join("\n\n")}
          />
        </div>
      </div>
    </div>
  )
}

function AssistantOkMessageBubble({
  content,
  exportClipDragEnabled,
}: {
  content: string
  exportClipDragEnabled: boolean
}) {
  const bubbleRef = React.useRef<HTMLDivElement>(null)
  const { bubbleCursorClass, bubbleCursorHandlers } = useGrabCursorOverSelection(
    bubbleRef,
    exportClipDragEnabled,
  )
  const bubbleClipDrag = useBubbleSelectionClipDrag(
    bubbleRef,
    "Assistant",
    exportClipDragEnabled,
  )

  return (
    <div className="flex justify-start">
      <div className="group/msg inline-flex max-w-3xl min-w-0 flex-col items-stretch">
        <div
          ref={bubbleRef}
          {...bubbleCursorHandlers}
          {...bubbleClipDrag}
          className={cn(
            assistantBubbleSurface,
            assistantBubbleTypography,
            "relative min-w-0 max-w-3xl",
            bubbleCursorClass,
          )}
        >
          <AssistantMarkdown content={content} />
        </div>
        <div className={messageCopyRowClass(exportClipDragEnabled)}>
          <ExportClipDragHandle
            bubbleRootRef={bubbleRef}
            clipRoleLabel="Assistant"
            enabled={exportClipDragEnabled}
          />
          <MessageCopyButton text={content} />
        </div>
      </div>
    </div>
  )
}

export type MessageBubbleProps = {
  message: ChatMessage
  onRetry?: (messageId: string) => void
  /** PDF export clip drag grip when export dialog is open for this thread. */
  exportClipDragEnabled?: boolean
}

export function MessageBubble({
  message,
  onRetry,
  exportClipDragEnabled = false,
}: MessageBubbleProps) {
  switch (message.type) {
    case "user":
      return (
        <UserMessageBubble
          content={message.content}
          exportClipDragEnabled={exportClipDragEnabled}
        />
      )
    case "quiz":
      return (
        <div className="flex justify-start">
          <QuizMessage message={message} />
        </div>
      )
    case "assistant-pending":
      return (
        <AssistantPendingMessageBubble
          message={message}
          exportClipDragEnabled={exportClipDragEnabled}
        />
      )
    case "assistant-error":
      return (
        <AssistantErrorMessageBubble
          message={message}
          onRetry={onRetry}
          exportClipDragEnabled={exportClipDragEnabled}
        />
      )
    case "assistant":
      return (
        <AssistantOkMessageBubble
          content={message.content}
          exportClipDragEnabled={exportClipDragEnabled}
        />
      )
    default:
      return null
  }
}
