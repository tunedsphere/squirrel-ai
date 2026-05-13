"use client"

import * as React from "react"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { MAX_PINS, THREAD_DRAG_MIME } from "@/lib/chat-constants"
import { libraryThreadPinVisual } from "@/lib/library-group-visual"
import type { Thread } from "@/lib/chat-types"

export { MAX_PINS, THREAD_DRAG_MIME }
/** JSON `{ "ids": string[] }` — ordered thread ids in a library group. */
export const THREAD_GROUP_DRAG_MIME = "application/x-ali-chat-thread-group"
export const TAB_DRAG_MIME = "application/x-ali-chat-tab"

/** At least this many cells so new users see drop targets before pinning anything. */
const MIN_VISIBLE_PIN_SLOTS = 3

const PIN_DRAG_PX = 36

export function threadTitleInitials(title: string): string {
  const parts = title
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Elements marked with this attribute are cloned for library → pins drag preview. */
export const PIN_DRAG_PREVIEW_SOURCE_SELECTOR = "[data-pin-drag-preview-source]"

/** Custom drag image: square chip with initials (like pin tabs), not the full row. */
export function setPinThreadDragPreview(
  e: React.DragEvent,
  title: string
): void {
  const dt = e.dataTransfer
  if (!dt) return

  const el = document.createElement("div")
  el.className = "pin-drag-preview-ghost"
  el.textContent = threadTitleInitials(title)
  el.setAttribute("aria-hidden", "true")
  document.body.appendChild(el)

  const half = PIN_DRAG_PX / 2
  dt.setDragImage(el, half, half)

  const remove = () => {
    el.remove()
  }
  document.addEventListener("dragend", remove, { once: true })
  window.setTimeout(remove, 8000)
}

/**
 * Drag preview by cloning a visible node (e.g. colored Lucide icon in the library).
 * Hotspot follows the pointer relative to `source`.
 */
export function setPinDragPreviewFromElement(
  e: React.DragEvent,
  source: HTMLElement
): void {
  const dt = e.dataTransfer
  if (!dt) return

  const rect = source.getBoundingClientRect()
  const clone = source.cloneNode(true) as HTMLElement
  clone.classList.add("pin-drag-preview-icon-clone")
  clone.removeAttribute("data-pin-drag-preview-source")
  clone.setAttribute("aria-hidden", "true")

  Object.assign(clone.style, {
    position: "fixed",
    left: "0",
    top: "0",
    margin: "0",
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    boxSizing: "border-box",
    pointerEvents: "none",
    zIndex: "2147483647",
  })

  document.body.appendChild(clone)

  const offX = Math.min(Math.max(e.clientX - rect.left, 0), rect.width)
  const offY = Math.min(Math.max(e.clientY - rect.top, 0), rect.height)

  dt.setDragImage(clone, offX, offY)

  const remove = () => {
    clone.remove()
  }
  document.addEventListener("dragend", remove, { once: true })
  window.setTimeout(remove, 8000)
}

type PinTabStripProps = {
  threads: Thread[]
  pinnedIds: string[]
  activeThreadId: string
  onPinnedChange: (next: string[]) => void
  onOpenThread: (threadId: string) => void
  /** True while dragging a thread from History / Library toward pins */
  threadDragActive?: boolean
  className?: string
}

export function PinTabStrip({
  threads,
  pinnedIds,
  activeThreadId,
  onPinnedChange,
  onOpenThread,
  threadDragActive = false,
  className,
}: PinTabStripProps) {
  const byId = React.useMemo(
    () => new Map(threads.map((t) => [t.id, t])),
    [threads]
  )

  const pruneMissing = React.useCallback(
    (ids: string[]) => ids.filter((id) => byId.has(id)),
    [byId]
  )

  const safePinned = React.useMemo(
    () => pruneMissing(pinnedIds).slice(0, MAX_PINS),
    [pinnedIds, pruneMissing]
  )

  const visibleCellCount = Math.min(
    MAX_PINS,
    Math.max(MIN_VISIBLE_PIN_SLOTS, safePinned.length + 1)
  )
  const emptySlots = Math.max(0, visibleCellCount - safePinned.length)

  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= safePinned.length) return
    const item = safePinned[from]
    if (!item) return
    const next = safePinned.filter((_, i) => i !== from)
    const insert = Math.min(to, next.length)
    next.splice(insert, 0, item)
    onPinnedChange(next)
  }

  const insertAt = (threadId: string, index: number) => {
    if (!byId.has(threadId)) return
    const deduped = safePinned.filter((id) => id !== threadId)
    const next = [...deduped]
    const i = Math.min(index, next.length)
    next.splice(i, 0, threadId)
    onPinnedChange(next.slice(0, MAX_PINS))
  }

  /** Insert ordered threads as one block at `index`, after stripping them from pins. */
  const insertManyAt = (orderedIds: string[], index: number) => {
    const valid = orderedIds.filter((id) => byId.has(id))
    if (valid.length === 0) return
    const next = safePinned.filter((id) => !valid.includes(id))
    const i = Math.min(index, next.length)
    const room = MAX_PINS - next.length
    const block = valid.slice(0, Math.max(0, room))
    if (block.length === 0) return
    next.splice(i, 0, ...block)
    onPinnedChange(next.slice(0, MAX_PINS))
  }

  const unpin = (threadId: string) => {
    onPinnedChange(safePinned.filter((id) => id !== threadId))
  }

  const onDragOverSlot = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const onDropSlot = (slotIndex: number) => (e: React.DragEvent) => {
    e.preventDefault()
    const threadPayload = e.dataTransfer.getData(THREAD_DRAG_MIME)
    const groupPayload = e.dataTransfer.getData(THREAD_GROUP_DRAG_MIME)
    const tabPayload = e.dataTransfer.getData(TAB_DRAG_MIME)

    if (threadPayload) {
      insertAt(threadPayload, slotIndex)
      return
    }

    if (groupPayload) {
      try {
        const parsed = JSON.parse(groupPayload) as { ids?: string[] }
        const ids = Array.isArray(parsed.ids) ? parsed.ids : []
        insertManyAt(ids, slotIndex)
      } catch {
        /* ignore */
      }
      return
    }

    if (tabPayload) {
      try {
        const { fromIndex } = JSON.parse(tabPayload) as { fromIndex: number }
        if (typeof fromIndex === "number") reorder(fromIndex, slotIndex)
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-0 w-full flex-col gap-1.5 group-data-[collapsible=icon]:hidden",
        className
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Pins
      </p>
      <div
        className={cn(
          "group/pins grid w-full grid-cols-3 gap-x-1.5 gap-y-1 rounded-lg p-0.5 transition-[box-shadow,background-color,border-color] duration-200",
          threadDragActive
            ? "border-2 border-dashed border-primary/50 bg-accent/20 shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary)_18%,transparent)]"
            : "border-2 border-transparent"
        )}
      >
        {safePinned.map((id, index) => {
          const t = byId.get(id)
          if (!t) return null
          const active = id === activeThreadId
          const { Icon, iconClassName } = libraryThreadPinVisual(t)
          return (
            <div
              key={id}
              className="group/tab relative h-8 w-full min-w-0"
              onDragOver={onDragOverSlot}
              onDrop={onDropSlot(index)}
            >
              <button
                type="button"
                draggable
                aria-label={t.title}
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    TAB_DRAG_MIME,
                    JSON.stringify({ fromIndex: index })
                  )
                  e.dataTransfer.effectAllowed = "move"
                }}
                onClick={() => onOpenThread(id)}
                title={t.title}
                className={cn(
                  "flex size-full min-h-0 items-center justify-center rounded-lg border transition-colors",
                  active
                    ? "border-primary/45 bg-sidebar-accent/30 text-sidebar-foreground shadow-sm"
                    : "border-border bg-sidebar-accent/30 text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <Icon
                  className={cn("size-[15px] shrink-0 sm:size-4", iconClassName)}
                  aria-hidden
                />
              </button>
              <button
                type="button"
                aria-label={`Unpin ${t.title}`}
                className="absolute right-0 top-0 z-10 flex size-3.5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground opacity-0 shadow-sm hover:text-foreground focus:opacity-100 group-hover/tab:opacity-100"
                onClick={(ev) => {
                  ev.stopPropagation()
                  unpin(id)
                }}
              >
                <X className="size-2.5" aria-hidden />
              </button>
            </div>
          )
        })}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div
            key={`empty-${i}`}
            role="button"
            tabIndex={0}
            aria-label="Drop a chat here to pin"
            className={cn(
              "flex h-8 w-full min-w-0 cursor-pointer items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/20 text-[10px] text-muted-foreground transition-colors",
              threadDragActive &&
                "border-primary/45 bg-accent/25 text-muted-foreground"
            )}
            onDragOver={onDragOverSlot}
            onDrop={onDropSlot(safePinned.length)}
          >
            +
          </div>
        ))}
      </div>
    </div>
  )
}
