import { loadExportSettings } from "@/lib/conversation-export-settings"
import {
  downloadHostElementAsRasterPdfFile,
  pdfA4PortraitInnerWidthPx,
} from "@/lib/conversation-export-output"
import { threadNotesCanvasToDataUrl } from "@/lib/thread-notes-canvas-draw"
import { sanitizeFilename } from "@/lib/thread-export"
import type { ThreadNotesCanvasState } from "@/lib/thread-notes-types"

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * Downloads thread notes (text + optional canvas sketch) as a raster PDF via the same
 * html2canvas + jsPDF path as conversation export.
 */
export async function downloadThreadNotesAsPdfFile(opts: {
  threadTitle: string
  notesText: string
  canvasState: ThreadNotesCanvasState
}): Promise<void> {
  if (typeof document === "undefined") return

  const settings = loadExportSettings()
  const marginMm = settings.pdfPrintMarginMm
  const stageW = pdfA4PortraitInnerWidthPx(marginMm)

  const title = opts.threadTitle.trim() || "Notes"
  const body = opts.notesText.replace(/\r\n/g, "\n")
  const hasSketch = opts.canvasState.strokes.length > 0
  const sketchDataUrl = hasSketch
    ? threadNotesCanvasToDataUrl(opts.canvasState, Math.min(stageW, 920), 360)
    : null

  const wrap = document.createElement("div")
  wrap.className = "sheet thread-notes-pdf-root"
  wrap.style.cssText = `box-sizing:border-box;width:${stageW}px;padding:28px 32px;background:#fff;color:#0f172a;font-family:ui-sans-serif,system-ui,sans-serif;font-size:15px;line-height:1.55;`
  wrap.innerHTML = `
    <h1 style="margin:0 0 1rem;font-size:1.35rem;font-weight:650;border-bottom:1px solid rgba(15,23,42,0.12);padding-bottom:0.65rem">
      ${escapeHtml(title)}
    </h1>
    <div style="white-space:pre-wrap;word-break:break-word;margin:0 0 ${sketchDataUrl ? "1.25rem" : "0"}">${escapeHtml(body) || "<span style=\"color:#64748b\">(empty)</span>"}</div>
    ${
      sketchDataUrl
        ? `<div style="margin:0;padding:0"><p style="margin:0 0 0.5rem;font-size:0.75rem;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.04em">Sketch</p><img src="${sketchDataUrl}" alt="" style="display:block;width:100%;height:auto;border:1px solid rgba(15,23,42,0.1);border-radius:6px" /></div>`
        : ""
    }
  `

  document.body.appendChild(wrap)
  try {
    await downloadHostElementAsRasterPdfFile(wrap, {
      fileBase: `${sanitizeFilename(title) || "notes"}-notes`,
      marginMm,
    })
  } finally {
    wrap.remove()
  }
}
