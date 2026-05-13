/** Shared parse of user-editable export markdown (# title, preamble, ## sections). */

export type ParsedStagedExport = {
  deckTitleFallback: string
  /** Lines before first `## ` slide (excluding the leading `#` title line); each non-empty line is a bullet candidate. */
  preambleLines: string[]
  slides: { title: string; bullets: string[] }[]
}

function stripWrappingTicks(s: string): string {
  const t = s.trim()
  if (t.startsWith("`") && t.endsWith("`") && t.length >= 2)
    return t.slice(1, -1).trim()
  return t
}

/** Derive a concise title hint from the markdown (thread title fallback). */
export function extractTrailingTitleLine(markdown: string): string | null {
  const m = /^#\s+(.+)$/m.exec(markdown)
  const raw = m?.[1]?.trim()
  return raw ? stripWrappingTicks(raw) || raw : null
}

/**
 * Parse staging markdown into slides. Each `## Heading` starts a new slide; body lines until the next `##` become bullets.
 * Content before the first `##` (after the document `#` title) is treated as preamble (Overview slide).
 */
export function parseStagedExportMarkdown(
  markdown: string,
  fallbackDeckTitle: string,
): ParsedStagedExport {
  const normalized = markdown.replace(/\r\n/g, "\n").trimEnd()
  const lines = normalized.split("\n")

  let deckTitleFallback = fallbackDeckTitle
  let i = 0
  if (lines[0]?.startsWith("# ")) {
    const t = lines[0].slice(2).trim()
    if (t) deckTitleFallback = t
    i = 1
    while (i < lines.length && lines[i]?.trim() === "") i++
  }

  const preambleLines: string[] = []
  while (i < lines.length && !lines[i]!.startsWith("## ")) {
    const L = lines[i]!.trim()
    if (L && L !== "---") preambleLines.push(L)
    i++
  }

  const slides: { title: string; bullets: string[] }[] = []

  let curTitle = ""
  let buf: string[] = []

  const flush = () => {
    const title = curTitle.trim() || "Slide"
    const bullets =
      buf
        .map((x) => x.trim())
        .filter((x) => x !== "" && x !== "---") ?? []
    if (!curTitle && bullets.length === 0) return
    slides.push({ title, bullets: bullets.length ? bullets : [" "] })
    curTitle = ""
    buf = []
  }

  for (; i < lines.length; i++) {
    const line = lines[i] ?? ""
    if (line.startsWith("## ")) {
      if (curTitle || buf.length) flush()
      curTitle = line.slice(3).trim()
      continue
    }
    buf.push(line)
  }
  if (curTitle || buf.length) flush()

  return { deckTitleFallback, preambleLines, slides }
}
