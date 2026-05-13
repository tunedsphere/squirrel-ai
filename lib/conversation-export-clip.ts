/** Clip snippets dragged/pasted into PDF export staging markdown. */

export const EXPORT_CLIP_DRAG_MIME = "application/x-squirrel-export-clip+json"

/** `document.documentElement` class while dragging text/PDF clips (cursor: grabbing). */
export const EXPORT_CLIP_DRAG_CURSOR_HTML_CLASS = "export-clip-drag-cursor"

export type ExportClipPayload = {
  /** Speaker label shown in PDF slide heading (e.g. User, Assistant). */
  role?: string
  excerpt: string
}

/** Dock drops append; overlay bands splice before a slide or after the last one. */
export type ExportClipInsertion =
  | { kind: "append" }
  | { kind: "gap"; gapIndex: number }

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

/** Minimal staged markdown so PDF preview renders the dropped selection first (dock cold-open). */
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

const DRAG_PREVIEW_CHAR_CAP = 96

/** Card-style drag ghost themed with CSS variables (`export-clip-drag-preview` in globals.css). */
export function attachExportClipDragPreviewImage(
  dataTransfer: DataTransfer,
  options: { excerpt: string; role?: string },
): void {
  if (typeof document === "undefined") return

  let excerpt = options.excerpt
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (excerpt.length > DRAG_PREVIEW_CHAR_CAP) {
    excerpt = excerpt.slice(0, DRAG_PREVIEW_CHAR_CAP).trimEnd() + "…"
  }
  if (!excerpt) excerpt = "Clip"

  const role = options.role?.trim()

  const shell = document.createElement("div")
  shell.className = "export-clip-drag-preview"
  shell.setAttribute("aria-hidden", "true")

  if (role) {
    const meta = document.createElement("span")
    meta.className = "export-clip-drag-preview__role"
    meta.textContent = role
    shell.appendChild(meta)
  }

  const body = document.createElement("p")
  body.className = "export-clip-drag-preview__text"
  body.textContent = excerpt
  shell.appendChild(body)

  document.body.appendChild(shell)
  void shell.offsetWidth

  const x = Math.min(72, Math.max(24, shell.offsetWidth / 2))
  const y = Math.min(44, Math.max(20, shell.offsetHeight / 2))

  try {
    dataTransfer.setDragImage(shell, Math.round(x), Math.round(y))
  } catch {
    /* stale engines */
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => shell.remove())
  })
}
