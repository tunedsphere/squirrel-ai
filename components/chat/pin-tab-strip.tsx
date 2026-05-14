"use client"

import * as React from "react"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  TAB_DRAG_MIME,
  THREAD_GROUP_DRAG_MIME,
} from "@/lib/chat-dnd"
import { MAX_PINS, THREAD_DRAG_MIME } from "@/lib/chat-constants"
import { libraryThreadPinVisual } from "@/lib/library-group-visual"
import type { Thread } from "@/lib/chat-types"

/** At least this many cells so new users see drop targets before pinning anything. */
const MIN_VISIBLE_PIN_SLOTS = 3

/** Index after the last pin — append when dropping on the strip “anywhere”. */
function tailSlotIndex(pinCount: number) {
  return pinCount
}

function pinStripAcceptsMime(e: React.DragEvent): boolean {
  const dt = e.dataTransfer
  if (!dt?.types) return false
  const types = Array.from(dt.types)
  return (
    types.includes(THREAD_DRAG_MIME) ||
    types.includes(THREAD_GROUP_DRAG_MIME) ||
    types.includes(TAB_DRAG_MIME)
  )
}

/** Reliable drop hint: MIME may be present before parent React state catches thread drag. */
function usePinStripDropGestures(
  pinsZoneRef: React.RefObject<HTMLElement | null>,
  pinStripAccepts: (e: React.DragEvent) => boolean,
) {
  const [dropChrome, setDropChrome] = React.useState(false)
  const [hoverSlotIndex, setHoverSlotIndex] = React.useState<number | null>(
    null,
  )

  React.useEffect(() => {
    const reset = () => {
      setDropChrome(false)
      setHoverSlotIndex(null)
    }
    window.addEventListener("dragend", reset)
    return () => {
      window.removeEventListener("dragend", reset)
    }
  }, [])

  const armMimeDragOver = React.useCallback(
    (e: React.DragEvent): boolean => {
      if (!pinStripAccepts(e)) return false
      e.preventDefault()
      e.dataTransfer.dropEffect = "move"
      setDropChrome(true)
      return true
    },
    [pinStripAccepts],
  )

  const onZoneDragLeave = React.useCallback(
    (e: React.DragEvent) => {
      const rt = e.relatedTarget as Node | null
      if (pinsZoneRef.current?.contains(rt)) return
      setDropChrome(false)
      setHoverSlotIndex(null)
    },
    [pinsZoneRef],
  )

  const onZoneDragEnter = React.useCallback(
    (e: React.DragEvent) => {
      armMimeDragOver(e)
    },
    [armMimeDragOver],
  )

  /** Capture ensures shallow targets (nested buttons, icons) cancel the drag default reliably. */
  const onZoneDragOverCapture = React.useCallback(
    (e: React.DragEvent) => {
      armMimeDragOver(e)
    },
    [armMimeDragOver],
  )

  const setSlotHover = React.useCallback(
    (slotIndex: number) => (e: React.DragEvent) => {
      if (!armMimeDragOver(e)) return
      e.stopPropagation()
      setHoverSlotIndex((prev) => (prev === slotIndex ? prev : slotIndex))
    },
    [armMimeDragOver],
  )

  const resetGestures = React.useCallback(() => {
    setDropChrome(false)
    setHoverSlotIndex(null)
  }, [])

  const clearHoverSlot = React.useCallback(() => {
    setHoverSlotIndex(null)
  }, [])

  return {
    dropChrome,
    hoverSlotIndex,
    armMimeDragOver,
    onZoneDragEnter,
    onZoneDragLeave,
    onZoneDragOverCapture,
    setSlotHover,
    resetGestures,
    clearHoverSlot,
  }
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
    [threads],
  )

  const pruneMissing = React.useCallback(
    (ids: string[]) => ids.filter((id) => byId.has(id)),
    [byId],
  )

  const safePinned = React.useMemo(
    () => pruneMissing(pinnedIds).slice(0, MAX_PINS),
    [pinnedIds, pruneMissing],
  )

  const visibleCellCount = Math.min(
    MAX_PINS,
    Math.max(MIN_VISIBLE_PIN_SLOTS, safePinned.length + 1),
  )
  const emptySlots = Math.max(0, visibleCellCount - safePinned.length)

  const reorder = React.useCallback(
    (from: number, to: number) => {
      if (from === to || from < 0 || to < 0 || from >= safePinned.length) return
      const item = safePinned[from]
      if (!item) return
      const next = safePinned.filter((_, i) => i !== from)
      const insert = Math.min(to, next.length)
      next.splice(insert, 0, item)
      onPinnedChange(next)
    },
    [safePinned, onPinnedChange],
  )

  const insertAt = React.useCallback(
    (threadId: string, index: number) => {
      if (!byId.has(threadId)) return
      const deduped = safePinned.filter((id) => id !== threadId)
      const next = [...deduped]
      const i = Math.min(index, next.length)
      next.splice(i, 0, threadId)
      onPinnedChange(next.slice(0, MAX_PINS))
    },
    [byId, safePinned, onPinnedChange],
  )

  /** Insert ordered threads as one block at `index`, after stripping them from pins. */
  const insertManyAt = React.useCallback(
    (orderedIds: string[], index: number) => {
      const valid = orderedIds.filter((id) => byId.has(id))
      if (valid.length === 0) return
      const next = safePinned.filter((id) => !valid.includes(id))
      const i = Math.min(index, next.length)
      const room = MAX_PINS - next.length
      const block = valid.slice(0, Math.max(0, room))
      if (block.length === 0) return
      next.splice(i, 0, ...block)
      onPinnedChange(next.slice(0, MAX_PINS))
    },
    [byId, safePinned, onPinnedChange],
  )

  const unpin = React.useCallback(
    (threadId: string) => {
      onPinnedChange(safePinned.filter((id) => id !== threadId))
    },
    [safePinned, onPinnedChange],
  )

  /** Returns true when a recognised pin drag payload was applied (and default prevented). */
  const applyPinDrop = React.useCallback(
    (e: React.DragEvent, slotIndex: number): boolean => {
      const threadPayload = e.dataTransfer.getData(THREAD_DRAG_MIME)
      const groupPayload = e.dataTransfer.getData(THREAD_GROUP_DRAG_MIME)
      const tabPayload = e.dataTransfer.getData(TAB_DRAG_MIME)

      if (threadPayload) {
        if (!byId.has(threadPayload)) return false
        insertAt(threadPayload, slotIndex)
        return true
      }

      if (groupPayload) {
        try {
          const parsed = JSON.parse(groupPayload) as { ids?: string[] }
          const ids = Array.isArray(parsed.ids) ? parsed.ids : []
          if (ids.length === 0) return false
          insertManyAt(ids, slotIndex)
          return true
        } catch {
          return false
        }
      }

      if (tabPayload) {
        try {
          const { fromIndex } = JSON.parse(tabPayload) as { fromIndex: number }
          if (typeof fromIndex !== "number" || fromIndex < 0) return false
          reorder(fromIndex, slotIndex)
          return true
        } catch {
          return false
        }
      }

      return false
    },
    [byId, insertAt, insertManyAt, reorder],
  )

  const stripRootRef = React.useRef<HTMLDivElement>(null)
  const {
    dropChrome,
    hoverSlotIndex,
    armMimeDragOver,
    onZoneDragEnter,
    onZoneDragLeave,
    onZoneDragOverCapture,
    setSlotHover,
    resetGestures,
    clearHoverSlot,
  } = usePinStripDropGestures(stripRootRef, pinStripAcceptsMime)

  const stripReady = threadDragActive || dropChrome

  const dropCommitted = React.useCallback(
    (e: React.DragEvent, slotIndex: number): boolean => {
      if (!pinStripAcceptsMime(e)) return false
      e.preventDefault()
      try {
        return applyPinDrop(e, slotIndex)
      } finally {
        resetGestures()
      }
    },
    [applyPinDrop, resetGestures],
  )

  const dropOnSlot = React.useCallback(
    (slotIndex: number) => (e: React.DragEvent) => {
      if (!dropCommitted(e, slotIndex)) return
      e.stopPropagation()
    },
    [dropCommitted],
  )

  const onDropPinStripTail = React.useCallback(
    (e: React.DragEvent) => {
      const tail = tailSlotIndex(safePinned.length)
      if (!dropCommitted(e, tail)) return
      e.stopPropagation()
    },
    [dropCommitted, safePinned.length],
  )

  const tailIx = tailSlotIndex(safePinned.length)

  const onPinsGridDragOver = React.useCallback(
    (e: React.DragEvent) => {
      armMimeDragOver(e)
      if (e.target === e.currentTarget) clearHoverSlot()
    },
    [armMimeDragOver, clearHoverSlot],
  )

  const onStripChromeDragOver = React.useCallback(
    (e: React.DragEvent) => {
      armMimeDragOver(e)
    },
    [armMimeDragOver],
  )

  return (
    <div
      ref={stripRootRef}
      className={cn(
        "flex min-h-0 w-full flex-col gap-1.5 group-data-[collapsible=icon]:hidden",
        className,
      )}
      onDragEnter={onZoneDragEnter}
      onDragLeave={onZoneDragLeave}
      onDragOver={onStripChromeDragOver}
      onDragOverCapture={onZoneDragOverCapture}
      onDrop={onDropPinStripTail}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Pins
      </p>
      <div
        className={cn(
          "group/pins grid w-full grid-cols-3 gap-x-1.5 gap-y-1 rounded-lg p-0.5 transition-[box-shadow,background-color,border-color] duration-200",
          stripReady
            ? "border-2 border-dashed border-primary/50 bg-accent/20 shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary)_18%,transparent)]"
            : "border-2 border-transparent",
        )}
        onDragOver={onPinsGridDragOver}
        onDragOverCapture={onZoneDragOverCapture}
        onDrop={(e) => {
          if (e.target !== e.currentTarget) return
          onDropPinStripTail(e)
        }}
      >
        {safePinned.map((id, index) => {
          const t = byId.get(id)
          if (!t) return null
          const active = id === activeThreadId
          const { Icon, iconClassName } = libraryThreadPinVisual(t)
          const slotLit =
            stripReady && hoverSlotIndex === index
          return (
            <div
              key={id}
              className="group/tab relative h-8 w-full min-w-0"
              draggable
              onDragStart={(e) => {
                const target = e.target as HTMLElement | null
                if (target?.closest?.("[data-pin-unpin]")) {
                  e.preventDefault()
                  return
                }
                e.dataTransfer.setData(
                  TAB_DRAG_MIME,
                  JSON.stringify({ fromIndex: index }),
                )
                e.dataTransfer.effectAllowed = "move"
              }}
              onDragOver={setSlotHover(index)}
              onDragOverCapture={onZoneDragOverCapture}
              onDrop={dropOnSlot(index)}
            >
              <button
                type="button"
                draggable={false}
                aria-label={t.title}
                onClick={() => onOpenThread(id)}
                title={t.title}
                className={cn(
                  "flex size-full min-h-0 cursor-grab active:cursor-grabbing items-center justify-center rounded-lg border transition-[color,background-color,border-color,box-shadow,ring]",
                  active
                    ? "border-primary/45 bg-sidebar-accent/30 text-sidebar-foreground shadow-sm"
                    : "border-border bg-sidebar-accent/30 text-sidebar-foreground hover:bg-sidebar-accent/50",
                  slotLit &&
                    "shadow-md ring-2 ring-primary/85 ring-offset-2 ring-offset-background",
                )}
              >
                <Icon
                  className={cn("size-[15px] shrink-0 sm:size-4", iconClassName)}
                  aria-hidden
                />
              </button>
              <button
                type="button"
                data-pin-unpin
                aria-label={`Unpin ${t.title}`}
                className="absolute right-0 top-0 z-10 flex size-3.5 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground opacity-0 shadow-sm hover:text-foreground focus:opacity-100 group-hover/tab:opacity-100"
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
              stripReady &&
                "border-primary/45 bg-accent/25 text-muted-foreground",
              stripReady &&
                hoverSlotIndex === tailIx &&
                "border-solid border-primary/70 shadow-[inset_0_0_0_2px_color-mix(in_oklch,var(--primary)_40%,transparent)]",
            )}
            onDragOver={setSlotHover(tailIx)}
            onDragOverCapture={onZoneDragOverCapture}
            onDrop={dropOnSlot(tailIx)}
          >
            +
          </div>
        ))}
      </div>
    </div>
  )
}
