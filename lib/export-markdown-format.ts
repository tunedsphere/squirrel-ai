/**
 * Small, export-only markdown helpers: inline emphasis, headings in body lines,
 * preamble noise removal, and plain-text fallbacks for Office output.
 * Not a full Markdown implementation — tuned for chat export drafts.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Strip leading punctuation noise sometimes seen in titles (e.g. ":; Topic…"). */
export function sanitizeExportDeckTitle(title: string): string {
  return title
    .replace(/^[\s.:;,\-–—_]+/u, "")
    .replace(/\s+/g, " ")
    .trim()
}

const THREAD_ID_LINE_RE = /^Thread id:\s*/i

/** Remove metadata lines that should not appear in export output (PDF/PPTX/preview). */
export function filterExportPreambleLines(lines: string[]): string[] {
  return lines.filter((raw) => {
    const line = raw.trim()
    if (!line) return false
    if (THREAD_ID_LINE_RE.test(line)) return false
    return true
  })
}

/** Optional GFM list marker at start of a body line. */
function stripLeadingListMarker(line: string): string {
  return line.replace(/^[-*+]\s+/, "")
}

function applyBoldAndItalic(escaped: string): string {
  let s = escaped
  for (let guard = 0; guard < 32; guard++) {
    const next = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    if (next === s) break
    s = next
  }
  s = s.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>")
  return s
}

/** Safe inline HTML for one span of user text (code, bold, italic). */
export function renderExportInlineMarkdownToHtml(raw: string): string {
  const chunks = raw.split("`")
  return chunks
    .map((chunk, i) => {
      if (i % 2 === 1) {
        return `<code class="export-code">${escapeHtml(chunk)}</code>`
      }
      return applyBoldAndItalic(escapeHtml(chunk))
    })
    .join("")
}

/**
 * One logical line from a slide body → block HTML (paragraph or subheading).
 */
export function exportMarkdownLineToBlockHtml(line: string): string {
  const t = line.trim()
  if (!t) return `<p class="b export-p">&nbsp;</p>`
  const stripped = stripLeadingListMarker(t)
  const heads = /^(#{1,6})\s+(.+)$/.exec(stripped)
  if (heads) {
    const level = heads[1].length
    const inner = renderExportInlineMarkdownToHtml(heads[2].trim())
    if (level <= 3)
      return `<h3 class="export-md-h">${inner}</h3>`
    return `<h4 class="export-md-h export-md-h-deep">${inner}</h4>`
  }
  return `<p class="b export-p">${renderExportInlineMarkdownToHtml(stripped)}</p>`
}

export function exportBulletLinesToHtmlBody(lines: string[]): string {
  return lines.map((x) => exportMarkdownLineToBlockHtml(x)).join("")
}

/** Plain text for PPTX / filenames — drops common markdown syntax. */
export function stripExportMarkdownToPlain(s: string): string {
  let t = s.trim()
  t = stripLeadingListMarker(t)
  t = t.replace(/^#{1,6}\s+/, "")
  for (let g = 0; g < 32; g++) {
    const n = t.replace(/\*\*([^*]+)\*\*/g, "$1")
    if (n === t) break
    t = n
  }
  t = t.replace(/`([^`]+)`/g, "$1")
  t = t.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1")
  return t.replace(/\s+/g, " ").trim()
}

/** True when slide title is only the chat speaker label (hidden in exports). */
export function isExportSpeakerRoleTitle(rawTitle: string): boolean {
  const t = stripExportMarkdownToPlain(rawTitle).toLowerCase()
  return t === "user" || t === "assistant"
}

export function finalizeParsedExportForOutput<
  T extends { preambleLines: string[]; deckTitleFallback: string },
>(parsed: T): T {
  return {
    ...parsed,
    preambleLines: filterExportPreambleLines(parsed.preambleLines),
    deckTitleFallback: sanitizeExportDeckTitle(parsed.deckTitleFallback),
  }
}
