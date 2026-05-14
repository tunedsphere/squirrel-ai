"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { GripVertical } from "lucide-react"

import { applyExportClipToDataTransfer } from "@/lib/conversation-export-clip"
import { setExportClipDomDragActive } from "@/lib/export-clip-drag-session"
import { cn } from "@/lib/utils"

const HANDLE_PX = 32
const GAP_ABOVE_SELECTION_PX = 4
/** Nudge into the selection from the top-right union rect for a firmer anchor. */
const OVERLAP_FROM_RIGHT_PX = 10

/** Best-effort union of client rects — `getBoundingClientRect()` sometimes yields 0×0 for wrapped selections. */
function unionRangeRect(range: Range): DOMRect {
  let minL = Infinity
  let minT = Infinity
  let maxR = -Infinity
  let maxB = -Infinity
  let any = false

  const rects = range.getClientRects()
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i]!
    if (r.width < 1 && r.height < 1) continue
    any = true
    minL = Math.min(minL, r.left)
    minT = Math.min(minT, r.top)
    maxR = Math.max(maxR, r.right)
    maxB = Math.max(maxB, r.bottom)
  }

  if (any) {
    return new DOMRect(minL, minT, maxR - minL, maxB - minT)
  }

  const u = range.getBoundingClientRect()
  return new DOMRect(u.left, u.top, u.width, u.height)
}

function getOverflowScrollAncestors(el: HTMLElement | null): HTMLElement[] {
  const out: HTMLElement[] = []
  let cur: HTMLElement | null = el
  while (cur) {
    const st = typeof window !== "undefined" ? getComputedStyle(cur) : null
    if (st) {
      const oy = st.overflowY
      const ox = st.overflowX
      if (
        ["auto", "scroll", "overlay"].includes(oy) ||
        ["auto", "scroll", "overlay"].includes(ox)
      ) {
        out.push(cur)
      }
    }
    cur = cur.parentElement
  }
  return out
}

function clampToViewport(left: number, top: number, size: number, pad = 8) {
  const vw =
    typeof window !== "undefined" ? window.visualViewport?.width ?? window.innerWidth : 0
  const vh =
    typeof window !== "undefined" ? window.visualViewport?.height ?? window.innerHeight : 0
  if (!vw || !vh) return { left, top }
  const minL =
    pad + (typeof window !== "undefined" ? window.visualViewport?.offsetLeft ?? 0 : 0)
  const minT =
    pad + (typeof window !== "undefined" ? window.visualViewport?.offsetTop ?? 0 : 0)
  const maxL = minL + vw - size - pad
  const maxT = minT + vh - size - pad

  return {
    left: Math.min(Math.max(left, minL), maxL),
    top: Math.min(Math.max(top, minT), maxT),
  }
}

/** Non-empty trimmed selection excerpt fully contained in root. */
export function getExportClipFloatingSelectionMetrics(
  root: HTMLElement | null | undefined,
): { excerpt: string; rect: DOMRect } | null {
  if (typeof window === "undefined" || !root) return null
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || !sel.rangeCount) return null

  const range = sel.getRangeAt(0)
  let ancestor: Node | null = range.commonAncestorContainer
  if (ancestor.nodeType === Node.TEXT_NODE) ancestor = ancestor.parentElement
  if (!ancestor || !(ancestor instanceof Element) || !root.contains(ancestor)) {
    return null
  }

  const excerpt = sel.toString().trim()
  if (!excerpt) return null

  const union = unionRangeRect(range)
  if (union.width < 1 && union.height < 1) return null

  return { excerpt, rect: union }
}

function handlePositionPx(rect: DOMRect) {
  const left = rect.right - HANDLE_PX + OVERLAP_FROM_RIGHT_PX
  const top = rect.top - HANDLE_PX - GAP_ABOVE_SELECTION_PX
  return clampToViewport(left, top, HANDLE_PX)
}

export type ExportClipFloatingDragHandleProps = {
  bubbleRootRef: React.RefObject<HTMLElement | null>
  clipRoleLabel: string
  enabled: boolean
}

export function ExportClipFloatingDragHandle({
  bubbleRootRef,
  clipRoleLabel,
  enabled,
}: ExportClipFloatingDragHandleProps) {
  const excerptSnapshotRef = React.useRef("")

  const [mounted, setMounted] = React.useState(false)

  /** Viewport-fixed position — null when hidden. */
  const [pos, setPos] = React.useState<{ left: number; top: number } | null>(null)

  const rafRef = React.useRef<number | null>(null)

  const measure = React.useCallback(() => {
    if (!enabled || !clipRoleLabel) {
      setPos(null)
      return
    }

    const root = bubbleRootRef.current
    const metrics = getExportClipFloatingSelectionMetrics(root)
    if (!metrics) {
      setPos(null)
      return
    }

    const { rect } = metrics
    setPos(handlePositionPx(rect))
  }, [enabled, clipRoleLabel, bubbleRootRef])

  const scheduleMeasure = React.useCallback(() => {
    if (typeof window === "undefined") return
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      measure()
    })
  }, [measure])

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useLayoutEffect(() => {
    measure()
    if (!enabled || !clipRoleLabel) return

    const onSelChange = () => scheduleMeasure()

    document.addEventListener("selectionchange", onSelChange)
    window.addEventListener("resize", scheduleMeasure)

    const vv = window.visualViewport
    vv?.addEventListener("resize", scheduleMeasure)
    vv?.addEventListener("scroll", scheduleMeasure)

    const rootNow = bubbleRootRef.current
    const scrollAncestors = getOverflowScrollAncestors(rootNow ?? null)

    window.addEventListener("scroll", scheduleMeasure, true)
    for (const el of scrollAncestors) {
      el.addEventListener("scroll", scheduleMeasure, { passive: true })
    }

    const roEl = bubbleRootRef.current
    const ro =
      typeof ResizeObserver !== "undefined" && roEl
        ? new ResizeObserver(() => scheduleMeasure())
        : null
    if (ro && roEl) ro.observe(roEl)

    return () => {
      document.removeEventListener("selectionchange", onSelChange)
      window.removeEventListener("resize", scheduleMeasure)
      vv?.removeEventListener("resize", scheduleMeasure)
      vv?.removeEventListener("scroll", scheduleMeasure)
      window.removeEventListener("scroll", scheduleMeasure, true)
      for (const el of scrollAncestors) {
        el.removeEventListener("scroll", scheduleMeasure)
      }
      ro?.disconnect()
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [enabled, clipRoleLabel, bubbleRootRef, measure, scheduleMeasure])

  React.useEffect(() => {
    if (!enabled || !clipRoleLabel) setPos(null)
  }, [enabled, clipRoleLabel])

  const snapshotSelection = React.useCallback(() => {
    excerptSnapshotRef.current = ""
    const root = bubbleRootRef.current
    const metrics = getExportClipFloatingSelectionMetrics(root)
    if (!metrics?.excerpt) return
    excerptSnapshotRef.current = metrics.excerpt
  }, [bubbleRootRef])

  const clearSnapshot = React.useCallback(() => {
    excerptSnapshotRef.current = ""
    setExportClipDomDragActive(false)
  }, [])

  const onDragStart = (e: React.DragEvent<HTMLButtonElement>) => {
    if (!enabled || !clipRoleLabel) {
      e.preventDefault()
      clearSnapshot()
      return
    }

    const root = bubbleRootRef.current
    let text = excerptSnapshotRef.current.trim()
    excerptSnapshotRef.current = ""

    if (!text && root) {
      const sel = window.getSelection()
      if (sel?.rangeCount) {
        const range = sel.getRangeAt(0)
        if (root.contains(range.commonAncestorContainer)) {
          text = sel.toString().trim()
        }
      }
    }

    if (
      !text ||
      !applyExportClipToDataTransfer(e.dataTransfer, {
        excerpt: text,
        role: clipRoleLabel,
      })
    ) {
      e.preventDefault()
      return
    }
    setExportClipDomDragActive(true)
  }

  const show = Boolean(mounted && enabled && clipRoleLabel && pos)

  const node =
    show && typeof document !== "undefined" ? (
      <button
        type="button"
        draggable
        onPointerDownCapture={snapshotSelection}
        onDragStart={onDragStart}
        onDragEnd={clearSnapshot}
        onPointerCancel={clearSnapshot}
        title="Drag clip to Dock action"
        aria-label="Drag selected text to Dock action"
        className={cn(
          "pointer-events-auto fixed z-[80] inline-flex touch-none items-center justify-center rounded-md border border-border/80 bg-popover shadow-md",
          "size-8 shrink-0",
          "text-muted-foreground",
          "cursor-grab active:cursor-grabbing",
          "select-none outline-none",
          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
        )}
        style={{ left: pos!.left, top: pos!.top }}
      >
        <GripVertical className="pointer-events-none size-3.5" aria-hidden />
      </button>
    ) : null

  if (!node) return null

  return createPortal(node, document.body)
}
