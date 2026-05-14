/** Clip snippets dragged/pasted into PDF export staging markdown. */

import { THREAD_DRAG_MIME } from "@/lib/chat-constants"
import { isExportClipDomDragActive } from "@/lib/export-clip-drag-session"

export const EXPORT_CLIP_DRAG_MIME = "application/x-squirrel-export-clip+json"

/** Internal drag for reordering `##` slides in the PDF export dialog (not for cross-app DnD). */
export const EXPORT_STAGING_SLIDE_REORDER_MIME =
  "application/x-squirrel-export-slide-reorder+json"

/** Marks a clip dragged from the PDF pending buffer (carries opaque id referencing workspace queue). */
export const EXPORT_PENDING_CLIP_DRAG_MIME =
  "application/x-squirrel-pending-export-clip+json"

export type ExportClipPayload = {
  /** Speaker label shown in PDF slide heading (e.g. User, Assistant). */
  role?: string
  excerpt: string
}

/** Dock uses last gap while PDF export is open; overlay bands pick any gap before/after a slide. */
export type ExportClipInsertion =
  | { kind: "append" }
  | { kind: "gap"; gapIndex: number }

/** True during dragover/drop when a PDF preview gap target should activate (dock clip handle, buffer chip, structured MIME, or typed plain excerpt). */
export function dataTransferAllowsPdfGapPlacement(dt: DataTransfer | null): boolean {
  if (isExportClipDomDragActive()) return true
  if (!dt || typeof dt.types === "undefined" || dt.types.length === 0) return false

  const types = Array.from(dt.types)
  if (types.includes("Files")) return false
  if (types.includes(THREAD_DRAG_MIME)) return false
  if (types.includes(EXPORT_STAGING_SLIDE_REORDER_MIME)) return false
  if (types.includes(EXPORT_PENDING_CLIP_DRAG_MIME)) return true
  if (types.includes(EXPORT_CLIP_DRAG_MIME)) return true
  if (types.includes("text/plain")) return true
  if (types.some((t) => /^text\/plain(;|$)/i.test(t))) return true

  if (typeof dt.items !== "undefined" && dt.items) {
    for (let i = 0; i < dt.items.length; i++) {
      if (dt.items[i]?.kind === "file") return false
    }
  }

  return false
}

function findSlideHeadingLineIndices(lines: string[]): number[] {
  let i = 0
  if (lines[0]?.startsWith("# ")) {
    i = 1
    while (i < lines.length && lines[i]?.trim() === "") i++
  }
  while (i < lines.length && !lines[i]!.startsWith("## ")) i++
  const slideStarts: number[] = []
  for (; i < lines.length; i++) {
    if (lines[i]!.startsWith("## ")) slideStarts.push(i)
  }
  return slideStarts
}

/** Number of vertical drop bands for preview overlay (before first slide … append after last). */
export function countExportStagingGaps(markdown: string): number {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n")
  const slideStarts = findSlideHeadingLineIndices(lines)
  return slideStarts.length === 0 ? 1 : slideStarts.length + 1
}

/** Minimal staged markdown so PDF preview renders the dropped selection inline (legacy single-clip cold open). */
export function stagingMarkdownForPdfSelectionPreview(
  threadTitle: string,
  excerpt: string,
  role?: string,
): string {
  const title = threadTitle.trim() || "Preview"
  const heading = role?.trim() ? `Selection (${role.trim()})` : "Selection"
  const body = excerpt.replace(/\r\n/g, "\n").trim()
  return `# ${title}\n\n---\n\n## ${heading}\n\n${body}\n`
}

export type PendingExportClip = { id: string } & ExportClipPayload

/** Minimal `#` deck + `---` only — clips start in the pending buffer until dropped on gaps. */
export function stagingMarkdownMinimalExportShell(threadTitle: string): string {
  const title = threadTitle.trim() || "Export"
  return `# ${title}\n\n---\n\n`
}

/** Heading line for one appended clip section (`## …` matches slide boundaries in staged export). */
export function formatExportClipSectionMarkdown(payload: ExportClipPayload): string {
  const excerpt = payload.excerpt.replace(/\r\n/g, "\n").trim()
  if (!excerpt) return ""

  const role = payload.role?.trim()
  const title = role ? `Clip (${role})` : "Clip"

  const bodyLines = excerpt.split("\n").map((line) => line.trimEnd())
  const body = bodyLines.join("\n").trim()

  return `\n\n## ${title}\n\n${body}\n\n`
}

export function appendExportClipToStagingMarkdown(
  staging: string,
  payload: ExportClipPayload,
): string {
  const block = formatExportClipSectionMarkdown(payload)
  if (!block) return staging
  return staging.trimEnd() + block
}

/**
 * Insert a clip block at a logical gap between `##` sections (same boundaries as `parseStagedExportMarkdown`).
 * gapIndex 0 = before first `##`; last index = append after final section. With no slides, only gap 0 (append at end).
 */
export function insertExportClipAtGap(
  staging: string,
  gapIndex: number,
  payload: ExportClipPayload,
): string {
  const block = formatExportClipSectionMarkdown(payload)
  if (!block) return staging

  const normalized = staging.replace(/\r\n/g, "\n")
  const lines = normalized.split("\n")
  const slideStarts = findSlideHeadingLineIndices(lines)
  const blockLines = block.trim().split("\n")

  const numGaps = slideStarts.length === 0 ? 1 : slideStarts.length + 1
  let g = gapIndex
  if (g < 0) g = 0
  if (g >= numGaps) g = numGaps - 1

  let insertLine: number
  if (slideStarts.length === 0) {
    insertLine = lines.length
  } else if (g === 0) {
    insertLine = slideStarts[0]!
  } else if (g < slideStarts.length) {
    insertLine = slideStarts[g]!
  } else {
    insertLine = lines.length
  }

  const next = [...lines.slice(0, insertLine), ...blockLines, ...lines.slice(insertLine)]
  return next.join("\n")
}

/** Insert clip at the final gap — same ordering as docking on the PDF orb when the preview overlay is unavailable. */
export function insertExportClipAtLastGap(staging: string, payload: ExportClipPayload): string {
  const g = countExportStagingGaps(staging)
  return insertExportClipAtGap(staging, Math.max(0, g - 1), payload)
}

/**
 * Moves one `##` slide block by index (0-based, in appearance order).
 * Prefix lines (deck `#` title and preamble before the first slide) stay fixed.
 */
export function reorderExportStagingSlidesByIndex(
  staging: string,
  fromSlideIndex: number,
  toSlideIndex: number,
): string {
  if (fromSlideIndex === toSlideIndex) return staging

  const normalized = staging.replace(/\r\n/g, "\n")
  const lines = normalized.split("\n")
  const slideStarts = findSlideHeadingLineIndices(lines)
  if (slideStarts.length < 2) return staging

  let f = fromSlideIndex
  let t = toSlideIndex
  if (f < 0 || f >= slideStarts.length) return staging
  if (t < 0 || t >= slideStarts.length) return staging

  const slideBlocks: string[][] = []
  for (let i = 0; i < slideStarts.length; i++) {
    const start = slideStarts[i]!
    const end = i + 1 < slideStarts.length ? slideStarts[i + 1]! : lines.length
    slideBlocks.push(lines.slice(start, end))
  }

  const prefix = lines.slice(0, slideStarts[0]!)

  const nextBlocks = [...slideBlocks]
  const [moved] = nextBlocks.splice(f, 1)
  if (moved === undefined) return staging
  nextBlocks.splice(t, 0, moved)

  return [...prefix, ...nextBlocks.flat()].join("\n")
}

/**
 * Applies plain text + EXPORT_CLIP_DRAG_MIME to `dataTransfer` (browser default drag feedback).
 * Returns false when excerpt is empty (caller should typically `preventDefault()` on dragstart).
 */
export function applyExportClipToDataTransfer(
  dataTransfer: DataTransfer,
  payload: ExportClipPayload,
): boolean {
  const excerpt = payload.excerpt.replace(/\r\n/g, "\n").trim()
  if (!excerpt) return false

  const role = payload.role?.trim()

  dataTransfer.setData("text/plain", excerpt)
  dataTransfer.setData(
    EXPORT_CLIP_DRAG_MIME,
    JSON.stringify(role ? { role, excerpt } : { excerpt }),
  )
  dataTransfer.effectAllowed = "copy"

  return true
}

/** Parse structured clip payload from DataTransfer (drag/drop); falls back to plain text only. */
export function exportClipPayloadFromDataTransfer(dt: DataTransfer): ExportClipPayload | null {
  const structured = dt.getData(EXPORT_CLIP_DRAG_MIME).trim()
  if (structured) {
    try {
      const parsed = JSON.parse(structured) as { role?: unknown; excerpt?: unknown }
      const excerpt =
        typeof parsed.excerpt === "string" ? parsed.excerpt.trim() : ""
      const role =
        typeof parsed.role === "string" ? parsed.role : undefined
      if (!excerpt) return null
      return { role, excerpt }
    } catch {
      /* invalid JSON — fall through */
    }
  }

  const plain = dt.getData("text/plain").trim()
  if (!plain) return null
  return { excerpt: plain }
}

/** Runs pending-id resolution then external clip merge; returns whether a drop was handled. */
export function consumeExportPdfGapDrop(
  dt: DataTransfer,
  gapIndex: number,
  handlers: {
    onGapPendingClip?: (gapIndex: number, pendingId: string) => void
    onGapClip: (gapIndex: number, payload: ExportClipPayload) => void
  },
): boolean {
  const pendingHandlers = handlers.onGapPendingClip
  const pendingId =
    typeof pendingHandlers === "function"
      ? pendingExportClipIdFromDataTransfer(dt)
      : null
  if (pendingId !== null && pendingHandlers) {
    pendingHandlers(gapIndex, pendingId)
    return true
  }
  const payload = exportClipPayloadFromDataTransfer(dt)
  if (!payload) return false
  const excerpt = payload.excerpt.trim()
  if (!excerpt) return false
  handlers.onGapClip(gapIndex, { role: payload.role, excerpt })
  return true
}

export function pendingExportClipIdFromDataTransfer(dt: DataTransfer): string | null {
  const raw = dt.getData(EXPORT_PENDING_CLIP_DRAG_MIME).trim()
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { id?: unknown }
    return typeof parsed.id === "string" && parsed.id.length > 0 ? parsed.id : null
  } catch {
    return null
  }
}

/**
 * Clipboard + structured MIME for a pending-slot clip drag; also stamps {@link EXPORT_PENDING_CLIP_DRAG_MIME}.
 */
export function applyPendingExportClipDragToDataTransfer(
  dataTransfer: DataTransfer,
  pending: PendingExportClip,
): boolean {
  if (!applyExportClipToDataTransfer(dataTransfer, pending)) return false
  dataTransfer.setData(EXPORT_PENDING_CLIP_DRAG_MIME, JSON.stringify({ id: pending.id }))
  return true
}
