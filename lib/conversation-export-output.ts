import {
  extractTrailingTitleLine,
  parseStagedExportMarkdown,
} from "@/lib/conversation-export-parse"
import {
  DEFAULT_CONVERSATION_EXPORT_SETTINGS,
  normalizeExportSettings,
  type PdfColorScheme,
  type PdfFontStack,
  type PdfHtmlLayoutSettings,
  type PdfSectionGapScale,
  type PdfTitleScale,
} from "@/lib/conversation-export-settings"
import {
  exportBulletLinesToHtmlBody,
  finalizeParsedExportForOutput,
  isExportSpeakerRoleTitle,
  renderExportInlineMarkdownToHtml,
  sanitizeExportDeckTitle,
  stripExportMarkdownToPlain,
} from "@/lib/export-markdown-format"
import { sanitizeFilename } from "@/lib/thread-export"

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function cssRootPalette(scheme: PdfColorScheme): string {
  switch (scheme) {
    case "high_contrast":
      return `--ink:#020617;--muted:#334155;--body:#0f172a;--rule:rgba(15,23,42,0.22);--accent:#3730a3;--code-bg:rgba(15,23,42,0.1)`
    case "print_black":
      return `--ink:#000000;--muted:#262626;--body:#171717;--rule:rgba(0,0,0,0.18);--accent:#000000;--code-bg:rgba(0,0,0,0.08)`
    default:
      return `--ink:#0f172a;--muted:#475569;--body:#334155;--rule:rgba(15,23,42,0.12);--accent:#4338ca;--code-bg:rgba(15,23,42,0.07)`
  }
}

function cssBodyFont(stack: PdfFontStack): string {
  if (stack === "serif") {
    return `Georgia,Cambria,"Times New Roman",Times,serif`
  }
  return `ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol"`
}

function cssBodyLetterSpacing(stack: PdfFontStack): string {
  return stack === "serif" ? "-0.004em" : "-0.009em"
}

function cssTitleBlock(scale: PdfTitleScale): string {
  switch (scale) {
    case "deck":
      return `margin:0 0 clamp(1.45rem,3vw,2.35rem);padding-bottom:1rem;border-bottom:1px solid var(--rule);font-size:clamp(1.85rem,2.8vw,2.45rem);font-weight:650;line-height:1.22;color:var(--ink);letter-spacing:-0.038em`
    case "large":
      return `margin:0 0 clamp(1.35rem,2.8vw,2rem);padding-bottom:.92rem;border-bottom:1px solid var(--rule);font-size:clamp(1.52rem,2vw,1.95rem);font-weight:650;line-height:1.24;color:var(--ink);letter-spacing:-0.036em`
    default:
      return `margin:0 0 clamp(1.25rem,2.5vw,1.85rem);padding-bottom:.85rem;border-bottom:1px solid var(--rule);font-size:clamp(1.375rem,1.6vw,1.75rem);font-weight:650;line-height:1.25;color:var(--ink);letter-spacing:-0.035em`
  }
}

function cssSectionPadding(gap: PdfSectionGapScale): string {
  switch (gap) {
    case "compact":
      return "clamp(0.65rem,1.2vw,1rem) 0"
    case "roomy":
      return "clamp(1.45rem,2.8vw,2.05rem) 0"
    default:
      return "clamp(1.1rem,2.2vw,1.65rem) 0"
  }
}

/** Build printable HTML matching the staged markdown structure. */
export function buildPrintHtmlFromStagedMarkdown(
  markdown: string,
  threadTitleFallback: string,
  pdfLayout: PdfHtmlLayoutSettings,
): string {
  const layout = normalizeExportSettings(pdfLayout)
  const hinted = extractTrailingTitleLine(markdown)
  const parsed = finalizeParsedExportForOutput(
    parseStagedExportMarkdown(markdown, threadTitleFallback),
  )
  const titleBase = sanitizeExportDeckTitle(hinted ?? parsed.deckTitleFallback)
  const docTitlePlain = escapeHtml(stripExportMarkdownToPlain(titleBase))
  const h1Html = renderExportInlineMarkdownToHtml(titleBase)

  const parts: string[] = []

  if (parsed.preambleLines.length > 0) {
    parts.push(
      `<section class="msg"><div class="role role-overview">Overview</div><div class="body">${exportBulletLinesToHtmlBody(parsed.preambleLines)}</div></section>`,
    )
  }

  for (const s of parsed.slides) {
    const body = exportBulletLinesToHtmlBody(s.bullets)
    if (isExportSpeakerRoleTitle(s.title)) {
      parts.push(`<section class="msg"><div class="body">${body}</div></section>`)
      continue
    }
    const role = renderExportInlineMarkdownToHtml(s.title)
    parts.push(
      `<section class="msg"><div class="role role-speaker">${role}</div><div class="body">${body}</div></section>`,
    )
  }

  const msgBorderBottom =
    layout.pdfSectionRule === "none" ? "none" : "1px solid var(--rule)"
  const sectionPad = cssSectionPadding(layout.pdfSectionGapScale)
  const titleCss = cssTitleBlock(layout.pdfTitleScale)
  const rootPalette = cssRootPalette(layout.pdfColorScheme)
  const bodyFontStack = cssBodyFont(layout.pdfFontStack)
  const bodyTrack = cssBodyLetterSpacing(layout.pdfFontStack)
  const codeFontEm = (0.9 * layout.pdfCodeScale).toFixed(3)
  const roleBodyClass =
    layout.pdfRoleStyle === "ribbon"
      ? "export-role-ribbon"
      : layout.pdfRoleStyle === "minimal"
        ? "export-role-minimal"
        : "export-role-hidden"

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${docTitlePlain}</title>
<style>
  @page{
    margin:${layout.pdfPrintMarginMm}mm;
  }
  :root{
    ${rootPalette};
  }
  *{box-sizing:border-box;}
  html{
    -webkit-print-color-adjust:exact;
    print-color-adjust:exact;
  }
  body{
    margin:0;
    font-family:${bodyFontStack};
    font-size:${layout.pdfBodyFontPx}px;
    line-height:${layout.pdfLineHeight};
    color:var(--body);
    letter-spacing:${bodyTrack};
  }
  .sheet h1{
    ${titleCss};
  }
  .sheet h1 strong{font-weight:700;}
  .sheet h1 em{font-style:italic;}
  .export-md-h{
    margin:0.85rem 0 0.45rem;
    font-size:1.08em;
    font-weight:650;
    color:var(--ink);
    letter-spacing:-0.02em;
    line-height:1.35;
    text-transform:none;
  }
  .export-md-h:first-child{margin-top:0;}
  .export-md-h-deep{
    font-size:1.02em;
    font-weight:600;
    color:var(--body);
  }
  .msg{
    margin:0;
    padding:${sectionPad};
    border-bottom:${msgBorderBottom};
  }
  .msg:last-child{border-bottom:0;padding-bottom:0;}
  .role{
    font-size:0.6875rem;
    font-weight:650;
    color:var(--muted);
    text-transform:uppercase;
    letter-spacing:0.09em;
    margin:0 0 0.55rem;
    padding-left:0.55rem;
    border-left:3px solid var(--accent);
    line-height:1.35;
    max-width:100%;
    word-break:break-word;
  }
  .export-role-minimal .role{
    border-left-width:2px;
    padding-left:0.4rem;
    font-size:0.62rem;
    letter-spacing:0.06em;
    text-transform:none;
  }
  .export-role-hidden .role-speaker{display:none!important;}
  .role strong,.role em,.role code{text-transform:none;letter-spacing:normal;font-size:0.95em;}
  .body .b{
    margin:0.45rem 0;
    line-height:inherit;
    color:var(--body);
    max-width:${layout.pdfBodyMaxMeasureCh}ch;
  }
  .body .export-p:first-child{margin-top:0;}
  .body strong{font-weight:650;color:var(--ink);}
  .body em{font-style:italic;}
  code.export-code{
    font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;
    font-size:${codeFontEm}em;
    font-weight:500;
    background:var(--code-bg);
    padding:0.1em 0.35em;
    border-radius:3px;
    white-space:${layout.pdfCodeWrap ? "pre-wrap" : "pre"};
    word-break:${layout.pdfCodeWrap ? "break-word" : "normal"};
    overflow-wrap:${layout.pdfCodeWrap ? "anywhere" : "normal"};
  }
  @media screen{
    html{
      background:#fff;
      min-height:100%;
    }
    body{
      padding:0;
    }
    .sheet{
      margin:0 auto;
      max-width:min(${layout.pdfSheetMaxWidthRem}rem,100%);
      padding:clamp(1.75rem,4.5vw,2.75rem) clamp(1.25rem,4vw,2.25rem) clamp(2rem,5vw,2.85rem);
      border-radius:0;
      background:#fff;
      border:none;
      box-shadow:none;
    }
  }
  @media print{
    html,body{background:#fff;}
    body{padding:0;}
    .sheet{
      max-width:none;
      margin:0;
      padding:0;
      border:0;
      border-radius:0;
      box-shadow:none;
    }
  }
</style></head><body class="${roleBodyClass}">
<div class="sheet">
<h1>${h1Html}</h1>
${parts.join("")}
</div>
</body></html>`
}

/** Properties html2canvas reads that may serialize as CSS Color 4 (`lab()`, etc.). */
const HTML2CANVAS_COLOR_PROPS = [
  "color",
  "background-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "outline-color",
  "text-decoration-color",
  "caret-color",
  "column-rule-color",
  "-webkit-text-fill-color",
] as const

/**
 * html2canvas cannot parse `lab()`, `oklch()`, etc. from computed styles (Tailwind 4 /
 * modern browsers often serialize colors that way). Canvas fillStyle accepts those
 * strings; ImageData yields RGBA we apply back as `rgba()` so html2canvas sees plain syntax.
 */
function coerceComputedColorsToRgb(doc: Document, root: HTMLElement): void {
  const win = doc.defaultView
  if (!win) return

  const probe = doc.createElement("canvas")
  probe.width = probe.height = 1
  const ctx = probe.getContext("2d", { willReadFrequently: true })
  if (!ctx) return

  const toRgba = (raw: string): string | null => {
    const t = raw.trim().toLowerCase()
    if (
      !t ||
      t === "transparent" ||
      t === "inherit" ||
      t === "initial" ||
      t === "unset" ||
      t === "currentcolor"
    ) {
      return null
    }
    if (t.startsWith("rgba(") || t.startsWith("rgb(")) return raw.trim()
    try {
      ctx.fillStyle = "#000000"
      ctx.fillStyle = raw
      ctx.globalAlpha = 1
      ctx.fillRect(0, 0, 1, 1)
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
      ctx.clearRect(0, 0, 1, 1)
      return `rgba(${r}, ${g}, ${b}, ${a / 255})`
    } catch {
      return null
    }
  }

  const walk = (el: HTMLElement) => {
    const tag = el.tagName
    if (tag === "SCRIPT" || tag === "STYLE") return

    const cs = win.getComputedStyle(el)
    for (const prop of HTML2CANVAS_COLOR_PROPS) {
      const rgba = toRgba(cs.getPropertyValue(prop))
      if (rgba) el.style.setProperty(prop, rgba)
    }

    for (let i = 0; i < el.children.length; i++) {
      walk(el.children[i] as HTMLElement)
    }
  }

  walk(root)
}

/**
 * html2canvas stacks multi-layer box-shadows poorly (often reads as a milky white veil).
 * Preview iframe uses the same `.sheet` shadow; strip only for raster PDF capture.
 */
function injectRasterPdfCaptureNormalize(clonedDoc: Document): void {
  const el = clonedDoc.createElement("style")
  el.setAttribute("data-raster-pdf-capture", "")
  el.textContent = `
    .sheet{
      box-shadow:none!important;
      filter:none!important;
    }
  `
  ;(clonedDoc.head ?? clonedDoc.documentElement).appendChild(el)
}

/** jsPDF default A4 portrait dimensions (mm). */
const PDF_A4_PORTRAIT_MM = { width: 210, height: 297 } as const

/**
 * Pixel width matching A4 portrait printable width for symmetric side margins.
 * Stage the iframe at this width so layout matches the PDF inner column before rasterizing.
 */
export function pdfA4PortraitInnerWidthPx(sideMarginMm: number): number {
  const innerMm = Math.max(40, PDF_A4_PORTRAIT_MM.width - 2 * sideMarginMm)
  return Math.max(280, Math.floor(innerMm * (96 / 25.4)))
}

/**
 * Wrap `.sheet` in a plain div that mirrors screen backdrop/padding from computed styles.
 */
function wrapSheetForRasterPdfCapture(doc: Document): {
  root: HTMLElement
  teardown: () => void
} {
  const sheet = doc.body.querySelector(".sheet") as HTMLElement | null
  if (!sheet || sheet.parentElement !== doc.body) {
    return { root: sheet ?? doc.body, teardown: () => {} }
  }

  const win = doc.defaultView
  let backdropBg = "#ffffff"
  let backdropPad = "0"
  if (win) {
    const htmlCs = win.getComputedStyle(doc.documentElement)
    const bgImg = htmlCs.backgroundImage
    if (bgImg && bgImg !== "none") {
      backdropBg = bgImg
    } else {
      const bgCol = htmlCs.backgroundColor
      if (
        bgCol &&
        bgCol !== "transparent" &&
        bgCol !== "rgba(0, 0, 0, 0)"
      ) {
        backdropBg = bgCol
      }
    }
    const bodyPad = win.getComputedStyle(doc.body).padding
    const compactPad = bodyPad.replace(/\s+/g, "")
    if (
      bodyPad &&
      compactPad !== "0px" &&
      compactPad !== "0px0px0px0px"
    ) {
      backdropPad = bodyPad
    }
  }

  const frame = doc.createElement("div")
  frame.className = "export-raster-frame"
  frame.setAttribute("aria-hidden", "true")
  frame.style.cssText = `box-sizing:border-box;min-height:100%;background:${backdropBg};padding:${backdropPad}`
  doc.body.insertBefore(frame, sheet)
  frame.appendChild(sheet)

  return {
    root: frame,
    teardown: () => {
      doc.body.insertBefore(sheet, frame)
      frame.remove()
    },
  }
}

/**
 * Rasterize DOM with html2canvas inside the staging iframe (never html2pdf's host overlay).
 * Page slicing follows the same geometry html2pdf used so tiles fit A4 inner dimensions.
 */
async function rasterizeElementToPdfBlob(
  element: HTMLElement,
  opts: {
    marginMm: number
    scale: number
    onclone?: (document: Document, element: HTMLElement) => void
  },
): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ])

  const margin = opts.marginMm
  const marginRect = [margin, margin, margin, margin] as const
  const innerWidthMm =
    PDF_A4_PORTRAIT_MM.width - marginRect[1] - marginRect[3]
  const innerHeightMm =
    PDF_A4_PORTRAIT_MM.height - marginRect[0] - marginRect[2]
  const innerRatio = innerHeightMm / innerWidthMm

  const canvas = await html2canvas(element, {
    scale: opts.scale,
    useCORS: true,
    logging: false,
    backgroundColor: null,
    foreignObjectRendering: false,
    scrollX: 0,
    scrollY: 0,
    onclone: (clonedDoc, clonedEl) => {
      injectRasterPdfCaptureNormalize(clonedDoc)
      coerceComputedColorsToRgb(clonedDoc, clonedDoc.documentElement)
      opts.onclone?.(clonedDoc, clonedEl)
    },
  })

  const pdf = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
  })

  const pxFullHeight = canvas.height
  const pxPageHeight = Math.max(1, Math.floor(canvas.width * innerRatio))
  const nPages = Math.max(1, Math.ceil(pxFullHeight / pxPageHeight))

  const pageCanvas = document.createElement("canvas")
  const pageCtx = pageCanvas.getContext("2d")
  if (!pageCtx) throw new Error("Raster PDF: missing canvas 2d context")

  pageCanvas.width = canvas.width

  let pageHeightMm = innerHeightMm

  for (let page = 0; page < nPages; page++) {
    let slicePx = pxPageHeight
    if (page === nPages - 1 && pxFullHeight % pxPageHeight !== 0) {
      slicePx = pxFullHeight % pxPageHeight
      pageHeightMm = (slicePx * innerWidthMm) / pageCanvas.width
    }

    pageCanvas.height = slicePx
    const w = pageCanvas.width
    const h = pageCanvas.height
    pageCtx.fillStyle = "#ffffff"
    pageCtx.fillRect(0, 0, w, h)
    pageCtx.drawImage(canvas, 0, page * pxPageHeight, w, h, 0, 0, w, h)

    if (page > 0) pdf.addPage()
    const imgData = pageCanvas.toDataURL("image/png")
    pdf.addImage(
      imgData,
      "PNG",
      marginRect[1],
      marginRect[0],
      innerWidthMm,
      pageHeightMm,
    )
  }

  return pdf.output("blob")
}

/**
 * Raster PDF from an element staged in the host document (e.g. thread notes snapshot).
 * Caller must attach/remove the element; raster uses the same pipeline as conversation export.
 */
export async function downloadHostElementAsRasterPdfFile(
  element: HTMLElement,
  opts: { fileBase: string; marginMm: number },
): Promise<void> {
  if (typeof document === "undefined") return

  const blob = await rasterizeElementToPdfBlob(element, {
    marginMm: opts.marginMm,
    scale: Math.min(
      Math.max(
        typeof window !== "undefined" ? window.devicePixelRatio || 2 : 2,
        2,
      ),
      3,
    ),
  })
  const safe =
    sanitizeFilename(stripExportMarkdownToPlain(opts.fileBase)) ||
    sanitizeFilename("notes")
  downloadBlob(`${safe}.pdf`, blob)
}

/** Opens a print dialog so the user can save as PDF (browser-dependent). */
export function printStagedMarkdownAsPdf(
  markdown: string,
  threadTitleFallback: string,
  pdfLayout: PdfHtmlLayoutSettings,
): void {
  const html = buildPrintHtmlFromStagedMarkdown(
    markdown,
    threadTitleFallback,
    pdfLayout,
  )
  // Must not pass `noopener` in features: spec requires `window.open` to return null,
  // so we never get a handle to call document.write / print.
  const w = window.open("", "_blank")
  if (!w) return
  try {
    w.opener = null
  } catch {
    /* ignore */
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
  w.focus()
  const runPrint = () => {
    try {
      w.print()
    } catch {
      /* ignore */
    }
  }
  if (w.document.readyState === "complete") {
    window.setTimeout(runPrint, 150)
  } else {
    w.addEventListener("load", () => window.setTimeout(runPrint, 150), { once: true })
  }
}

/**
 * Renders the same HTML as print export, then downloads a raster `.pdf` (html2canvas + jsPDF).
 * Raster runs entirely inside a staging iframe — never html2pdf's host-document overlay — so
 * opacity/backdrop compositing glitches stay gone. The iframe width matches A4 inner px width.
 */
export async function downloadStagedMarkdownAsPdfFile(
  markdown: string,
  threadTitleFallback: string,
  pdfLayout: PdfHtmlLayoutSettings,
): Promise<void> {
  if (typeof document === "undefined") return

  const layout = normalizeExportSettings(pdfLayout)
  const html = buildPrintHtmlFromStagedMarkdown(
    markdown,
    threadTitleFallback,
    pdfLayout,
  )

  const hinted = extractTrailingTitleLine(markdown)
  const fileBaseHint = sanitizeExportDeckTitle(hinted ?? threadTitleFallback)
  const fileBase =
    sanitizeFilename(stripExportMarkdownToPlain(fileBaseHint)) ||
    sanitizeFilename(threadTitleFallback)

  const marginMm = layout.pdfPrintMarginMm
  const stageWidthPx = pdfA4PortraitInnerWidthPx(marginMm)

  const iframe = document.createElement("iframe")
  iframe.setAttribute("aria-hidden", "true")
  // Never use opacity:0 here — Chromium often rasterizes descendants faded/washed out,
  // which reads as a white "overlay" in html2canvas output.
  iframe.style.cssText =
    `position:fixed;left:-10000px;top:0;width:${stageWidthPx}px;border:0;pointer-events:none;z-index:-1;opacity:1`
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument!
  doc.open()
  doc.write(html)
  doc.close()

  await new Promise<void>((resolve) => {
    const finish = () =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    if (doc.readyState === "complete") finish()
    else iframe.addEventListener("load", finish, { once: true })
  })

  await doc.fonts.ready.catch(() => {})

  const { root, teardown } = wrapSheetForRasterPdfCapture(doc)

  const contentHeight = Math.max(
    root.scrollHeight,
    doc.documentElement.scrollHeight,
    doc.body.scrollHeight,
    720,
  )
  iframe.style.height = `${contentHeight}px`

  await new Promise<void>((r) =>
    requestAnimationFrame(() => requestAnimationFrame(() => r())),
  )

  /** html2canvas pixels per CSS px; caps memory on dense layouts while beating default blur. */
  const rasterScale = Math.min(Math.max(window.devicePixelRatio || 2, 2), 3)

  try {
    const blob = await rasterizeElementToPdfBlob(root, {
      marginMm,
      scale: rasterScale,
    })
    downloadBlob(`${fileBase}.pdf`, blob)
  } finally {
    teardown()
    iframe.remove()
  }
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.rel = "noopener"
  a.click()
  URL.revokeObjectURL(url)
}

export async function downloadPptxFromStagedMarkdown(
  markdown: string,
  threadTitleFallback: string,
  pptBodyFontPx: number = DEFAULT_CONVERSATION_EXPORT_SETTINGS.pdfBodyFontPx,
): Promise<void> {
  const hinted = extractTrailingTitleLine(markdown)
  const fileBaseHint = sanitizeExportDeckTitle(hinted ?? threadTitleFallback)
  const fileBase =
    sanitizeFilename(stripExportMarkdownToPlain(fileBaseHint)) ||
    sanitizeFilename(threadTitleFallback)
  const parsed = finalizeParsedExportForOutput(
    parseStagedExportMarkdown(markdown, threadTitleFallback),
  )

  const pptxgen = (await import("pptxgenjs")).default
  const pres = new pptxgen()
  pres.layout = "LAYOUT_WIDE"
  pres.title = stripExportMarkdownToPlain(parsed.deckTitleFallback)
  pres.theme = {
    headFontFace: "Calibri Light",
    bodyFontFace: "Calibri",
  }

  const bodyPt = normalizeExportSettings({
    pdfBodyFontPx: pptBodyFontPx,
  }).pdfBodyFontPx
  const surface = "FAFAFB"
  const accent = "4F46E5"
  const titleColor = "0F172A"
  const bodyColor = "334155"

  const decorateSlide = (slide: ReturnType<(typeof pres)["addSlide"]>) => {
    slide.background = { color: surface }
    slide.addShape("rect", {
      x: 0,
      y: 0,
      w: 0.11,
      h: "100%",
      fill: { color: accent },
      line: { type: "none", color: accent },
    })
  }

  if (parsed.preambleLines.length > 0) {
    const slide = pres.addSlide()
    decorateSlide(slide)
    slide.addText("Overview", {
      x: 0.68,
      y: 0.48,
      w: 12,
      h: 0.95,
      fontSize: 28,
      bold: true,
      color: titleColor,
      fontFace: "Calibri Light",
    })
    slide.addText(
      parsed.preambleLines.map((text) => ({
        text: stripExportMarkdownToPlain(text),
        options: {
          bullet: true,
          fontSize: bodyPt,
          color: bodyColor,
          fontFace: "Calibri",
        },
      })),
      {
        x: 0.82,
        y: 1.52,
        w: 12,
        h: 5.85,
        valign: "top",
        lineSpacingMultiple: 1.12,
      },
    )
  }

  for (const s of parsed.slides) {
    const slide = pres.addSlide()
    decorateSlide(slide)
    const hideSpeakerTitle = isExportSpeakerRoleTitle(s.title)
    if (!hideSpeakerTitle) {
      slide.addText(stripExportMarkdownToPlain(s.title), {
        x: 0.68,
        y: 0.48,
        w: 12,
        h: 0.95,
        fontSize: 28,
        bold: true,
        color: titleColor,
        fontFace: "Calibri Light",
      })
    }
    slide.addText(
      s.bullets.map((text) => ({
        text: stripExportMarkdownToPlain(text),
        options: {
          bullet: true,
          fontSize: bodyPt,
          color: bodyColor,
          fontFace: "Calibri",
        },
      })),
      hideSpeakerTitle
        ? {
            x: 0.82,
            y: 0.52,
            w: 12,
            h: 6.38,
            valign: "top" as const,
            lineSpacingMultiple: 1.12,
          }
        : {
            x: 0.82,
            y: 1.52,
            w: 12,
            h: 5.85,
            valign: "top" as const,
            lineSpacingMultiple: 1.12,
          },
    )
  }

  if (parsed.preambleLines.length === 0 && parsed.slides.length === 0) {
    const slide = pres.addSlide()
    decorateSlide(slide)
    slide.addText("Conversation", {
      x: 0.68,
      y: 0.48,
      w: 12,
      h: 0.95,
      fontSize: 28,
      bold: true,
      color: titleColor,
      fontFace: "Calibri Light",
    })
    slide.addText("(No content)", {
      x: 0.82,
      y: 1.52,
      fontSize: bodyPt,
      color: bodyColor,
      fontFace: "Calibri",
    })
  }

  const blob = (await pres.write({ outputType: "blob" })) as Blob
  downloadBlob(`${fileBase}.pptx`, blob)
}
