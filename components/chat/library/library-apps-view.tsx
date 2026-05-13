"use client"

import * as React from "react"
import { ArrowLeft, LayoutGrid, MessageSquare } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { cn } from "@/lib/utils"
import type { ThreadFolderGroup } from "@/lib/group-threads"
import type { Thread } from "@/lib/chat-types"
import {
  libraryGroupDescription,
  libraryGroupVisual,
} from "@/lib/library-group-visual"
import { MAX_PINS, THREAD_DRAG_MIME } from "@/lib/chat-constants"
import {
  PIN_DRAG_PREVIEW_SOURCE_SELECTOR,
  THREAD_GROUP_DRAG_MIME,
  setPinDragPreviewFromElement,
  setPinThreadDragPreview,
} from "@/lib/chat-dnd"

/** Prefer cloning the colored icon cell; otherwise initials chip. */
function setLibraryPinDragPreview(
  e: React.DragEvent,
  titleFallback: string
): void {
  const root = e.currentTarget as HTMLElement
  const src = root.querySelector(PIN_DRAG_PREVIEW_SOURCE_SELECTOR)
  if (src instanceof HTMLElement) {
    setPinDragPreviewFromElement(e, src)
  } else {
    setPinThreadDragPreview(e, titleFallback)
  }
}

/** Min width for each horizontal group tile in the grid. */
const CELL_MIN = 260
const CELL_MAX = 420
const CELL_DEFAULT = 320

function groupThreadIds(g: ThreadFolderGroup): string[] {
  return g.threads.map((t) => t.id)
}

function pinMenuState(ids: string[], pinnedIds: string[]) {
  const pinsOutsideGroup = pinnedIds.filter((id) => !ids.includes(id)).length
  const slotsForGroup = MAX_PINS - pinsOutsideGroup
  const unpinnedInGroup = ids.filter((id) => !pinnedIds.includes(id))
  const canPinAll = unpinnedInGroup.length > 0 && slotsForGroup > 0
  const canUnpinAll = ids.some((id) => pinnedIds.includes(id))
  return { canPinAll, canUnpinAll }
}

export type LibraryAppsViewProps = {
  groups: ThreadFolderGroup[]
  pinnedIds: string[]
  onSelectThread: (threadId: string) => void
  onPinAllInGroup: (threadIds: string[]) => void
  onUnpinAllInGroup: (threadIds: string[]) => void
  onThreadDragStart?: () => void
  onThreadDragEnd?: () => void
  className?: string
}

export function LibraryAppsView({
  groups,
  pinnedIds,
  onSelectThread,
  onPinAllInGroup,
  onUnpinAllInGroup,
  onThreadDragStart,
  onThreadDragEnd,
  className,
}: LibraryAppsViewProps) {
  const [pickedOpenKey, setPickedOpenKey] = React.useState<string | null>(null)
  const [cellPx, setCellPx] = React.useState(CELL_DEFAULT)

  const rangeFillPct = React.useMemo(
    () =>
      `${((cellPx - CELL_MIN) / (CELL_MAX - CELL_MIN)) * 100}%` as const,
    [cellPx]
  )

  const openFolderKey = React.useMemo(() => {
    if (!pickedOpenKey) return null
    return groups.some((g) => g.folderKey === pickedOpenKey)
      ? pickedOpenKey
      : null
  }, [groups, pickedOpenKey])

  const openGroup = groups.find((g) => g.folderKey === openFolderKey)
  const openDetailVisual = openGroup ? libraryGroupVisual(openGroup) : null

  React.useEffect(() => {
    if (!openFolderKey) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPickedOpenKey(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [openFolderKey])

  if (groups.length === 0) {
    return (
      <div
        className={cn(
          "flex h-full min-h-0 flex-col items-center justify-center px-6 py-16 text-center",
          className
        )}
      >
        <LayoutGrid
          className="mb-4 size-14 text-muted-foreground/50"
          aria-hidden
        />
        <p className="text-base font-medium text-foreground">Library is empty</p>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Start chats from the sidebar — they will appear here as smart groups you
          can open.
        </p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden bg-background",
        className
      )}
    >
      {openGroup ? (
        <div
          key={openGroup.folderKey}
          className={cn(
            "flex h-full min-h-0 flex-col",
            "motion-reduce:animate-none motion-reduce:opacity-100 motion-reduce:translate-x-0",
            "animate-in fade-in-0 zoom-in-95 fill-mode-both duration-200"
          )}
        >
          <header className="flex shrink-0 items-center gap-2 border-b border-border/70 px-3 py-2.5 sm:px-6 sm:py-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 px-2"
              onClick={() => setPickedOpenKey(null)}
              aria-label="Back to library grid"
            >
              <ArrowLeft className="size-4" aria-hidden />
              <span className="hidden sm:inline">Library</span>
            </Button>
            {openDetailVisual ? (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-border/60 sm:size-10">
                {React.createElement(openDetailVisual.Icon, {
                  className: cn(
                    "size-[18px] sm:size-5",
                    openDetailVisual.iconClassName
                  ),
                  "aria-hidden": true,
                })}
              </span>
            ) : null}
            <h2 className="min-w-0 flex-1 truncate text-center text-sm font-semibold sm:text-left sm:text-base">
              {openGroup.folderTitle}
            </h2>
            <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
              {openGroup.threads.length} chats
            </span>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-8 sm:py-5">
            <ul className="mx-auto flex max-w-4xl flex-col gap-1">
              {openGroup.threads.map((t: Thread) => (
                <li key={t.id}>
                  <Button
                    type="button"
                    variant="ghost"
                    draggable
                    onDragStart={(e) => {
                      onThreadDragStart?.()
                      setLibraryPinDragPreview(e, t.title)
                      e.dataTransfer.setData(THREAD_DRAG_MIME, t.id)
                      e.dataTransfer.effectAllowed = "copyMove"
                    }}
                    onDragEnd={() => onThreadDragEnd?.()}
                    className="h-auto w-full justify-start gap-3 rounded-xl border border-transparent px-3 py-3.5 text-left font-normal hover:border-border/80 hover:bg-muted/40 sm:px-4"
                    onClick={() => onSelectThread(t.id)}
                  >
                    <span
                      data-pin-drag-preview-source
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-border/50"
                    >
                      <MessageSquare
                        className="size-5 text-primary"
                        aria-hidden
                      />
                    </span>
                    <span className="min-w-0 flex-1 text-sm leading-snug sm:text-[15px]">
                      {t.title}
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "flex h-full min-h-0 flex-col",
            "motion-reduce:animate-none motion-reduce:opacity-100",
            "animate-in fade-in-0 duration-200"
          )}
        >
          <div className="shrink-0 px-4 pb-2 pt-4 text-center sm:px-8 sm:pt-6">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Groups
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground/90 sm:text-xs">
              Drag a group to Pins, or right-click to pin / unpin threads
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-20 pt-2 sm:px-10 sm:pb-24 sm:pt-4">
            <div
              className="mx-auto grid w-full max-w-[min(100%,80rem)] gap-3 sm:gap-4"
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(${cellPx}px, 1fr))`,
              }}
            >
              {groups.map((g) => {
                const { Icon, iconClassName } = libraryGroupVisual(g)
                const description = libraryGroupDescription(g)
                const ids = groupThreadIds(g)
                const { canPinAll, canUnpinAll } = pinMenuState(ids, pinnedIds)

                return (
                  <ContextMenu key={g.folderKey}>
                    <ContextMenuTrigger asChild>
                      <button
                        type="button"
                        draggable
                        onDragStart={(e) => {
                          onThreadDragStart?.()
                          setLibraryPinDragPreview(e, g.folderTitle)
                          e.dataTransfer.setData(
                            THREAD_GROUP_DRAG_MIME,
                            JSON.stringify({ ids })
                          )
                          e.dataTransfer.effectAllowed = "copyMove"
                        }}
                        onDragEnd={() => onThreadDragEnd?.()}
                        onClick={() => setPickedOpenKey(g.folderKey)}
                        className={cn(
                          "group flex w-full min-w-0 flex-row items-stretch gap-3 rounded-2xl border border-border p-3 text-left outline-none transition-colors",
                          "hover:border-primary/35 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        )}
                      >
                        <span className="relative inline-flex shrink-0 self-center">
                          <span
                            data-pin-drag-preview-source
                            className="flex size-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-border/60 sm:size-14"
                          >
                            <Icon
                              className={cn(
                                "size-6 transition-transform duration-200 group-hover:scale-105 sm:size-7",
                                iconClassName
                              )}
                              aria-hidden
                            />
                          </span>
                          <span className="pointer-events-none absolute -right-1 -top-1 flex min-w-[1.125rem] items-center justify-center rounded-full border border-border bg-background px-1 py-0.5 text-[10px] font-semibold tabular-nums text-foreground shadow-sm">
                            {g.threads.length}
                          </span>
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-0.5 pr-1">
                          <span className="line-clamp-2 text-sm font-semibold leading-snug text-foreground sm:text-[15px]">
                            {g.folderTitle}
                          </span>
                          <span className="line-clamp-2 text-[11px] leading-snug text-muted-foreground sm:text-xs">
                            {description}
                          </span>
                        </span>
                      </button>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="min-w-44">
                      <ContextMenuItem
                        disabled={!canPinAll}
                        onSelect={() => onPinAllInGroup(ids)}
                      >
                        Pin all to pins
                      </ContextMenuItem>
                      <ContextMenuItem
                        disabled={!canUnpinAll}
                        variant="destructive"
                        onSelect={() => onUnpinAllInGroup(ids)}
                      >
                        Unpin all from pins
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem onSelect={() => setPickedOpenKey(g.folderKey)}>
                        Open group
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                )
              })}
            </div>
          </div>

          <div
            className="pointer-events-auto absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-full border border-border bg-background/95 px-2.5 py-1 shadow-md backdrop-blur-sm supports-backdrop-filter:bg-background/90 sm:bottom-6 sm:right-6"
            role="group"
            aria-label="Adjust group tile width"
          >
            <span className="hidden pl-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:inline">
              Width
            </span>
            <input
              type="range"
              min={CELL_MIN}
              max={CELL_MAX}
              step={8}
              value={cellPx}
              onChange={(e) => setCellPx(Number(e.target.value))}
              className="library-width-range w-[5.25rem] sm:w-32"
              style={
                {
                  ["--library-range-fill-pct" as string]: rangeFillPct,
                } as React.CSSProperties
              }
              aria-valuemin={CELL_MIN}
              aria-valuemax={CELL_MAX}
              aria-valuenow={cellPx}
              aria-label="Group tile minimum width"
            />
          </div>
        </div>
      )}
    </div>
  )
}
