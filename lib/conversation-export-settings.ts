export type ConversationExportFormat = "pdf" | "pptx"

export const EXPORT_SETTINGS_STORAGE_KEY = "chat-export-settings:v1"

export type PdfFontStack = "sans" | "serif"

export type PdfTitleScale = "normal" | "large" | "deck"

export type PdfSectionGapScale = "compact" | "normal" | "roomy"

export type PdfSectionRule = "hairline" | "none"

/** Speaker / section label chrome in PDF HTML (overview label vs slide titles). */
export type PdfRoleStyle = "ribbon" | "minimal" | "hidden"

export type PdfColorScheme = "default" | "high_contrast" | "print_black"

export type ConversationExportSettings = {
  includeThreadIdLine: boolean
  showSpeakerLabels: boolean
  pdfBodyFontPx: number
  /** Body line-height for PDF preview / print (unitless). */
  pdfLineHeight: number
  /** Screen preview sheet width cap before print spreads full width (rem). */
  pdfSheetMaxWidthRem: number
  /** Max line measure for body bullets (ch). */
  pdfBodyMaxMeasureCh: number
  pdfFontStack: PdfFontStack
  pdfTitleScale: PdfTitleScale
  pdfSectionGapScale: PdfSectionGapScale
  pdfSectionRule: PdfSectionRule
  pdfRoleStyle: PdfRoleStyle
  pdfColorScheme: PdfColorScheme
  /** `@page` margin when printing / saving PDF (mm). */
  pdfPrintMarginMm: number
  /** Relative scale for inline code vs previous 0.9em baseline (1 = default). */
  pdfCodeScale: number
  pdfCodeWrap: boolean
}

/** Fields consumed by `buildPrintHtmlFromStagedMarkdown`. */
export type PdfHtmlLayoutSettings = Pick<
  ConversationExportSettings,
  | "pdfBodyFontPx"
  | "pdfLineHeight"
  | "pdfSheetMaxWidthRem"
  | "pdfBodyMaxMeasureCh"
  | "pdfFontStack"
  | "pdfTitleScale"
  | "pdfSectionGapScale"
  | "pdfSectionRule"
  | "pdfRoleStyle"
  | "pdfColorScheme"
  | "pdfPrintMarginMm"
  | "pdfCodeScale"
  | "pdfCodeWrap"
>

export const DEFAULT_CONVERSATION_EXPORT_SETTINGS: ConversationExportSettings = {
  includeThreadIdLine: true,
  showSpeakerLabels: true,
  pdfBodyFontPx: 15,
  pdfLineHeight: 1.55,
  pdfSheetMaxWidthRem: 42,
  pdfBodyMaxMeasureCh: 65,
  pdfFontStack: "sans",
  pdfTitleScale: "normal",
  pdfSectionGapScale: "normal",
  pdfSectionRule: "hairline",
  pdfRoleStyle: "ribbon",
  pdfColorScheme: "default",
  pdfPrintMarginMm: 12,
  pdfCodeScale: 1,
  pdfCodeWrap: false,
}

function clampPdfLineHeight(n: number): number {
  const v = Math.round(n * 100) / 100
  return Math.min(1.85, Math.max(1.35, v))
}

function normalizePdfFontStack(v: unknown): PdfFontStack {
  return v === "serif" ? "serif" : "sans"
}

function normalizePdfTitleScale(v: unknown): PdfTitleScale {
  if (v === "large" || v === "deck") return v
  return "normal"
}

function normalizePdfSectionGapScale(v: unknown): PdfSectionGapScale {
  if (v === "compact" || v === "roomy") return v
  return "normal"
}

function normalizePdfSectionRule(v: unknown): PdfSectionRule {
  return v === "none" ? "none" : "hairline"
}

function normalizePdfRoleStyle(v: unknown): PdfRoleStyle {
  if (v === "minimal" || v === "hidden") return v
  return "ribbon"
}

function normalizePdfColorScheme(v: unknown): PdfColorScheme {
  if (v === "high_contrast" || v === "print_black") return v
  return "default"
}

function clampPdfPrintMarginMm(n: number): number {
  return Math.min(28, Math.max(6, Math.round(n)))
}

function clampPdfCodeScale(n: number): number {
  const v = Math.round(n * 1000) / 1000
  return Math.min(1.15, Math.max(0.8, v))
}

export function normalizeExportSettings(
  partial: Partial<ConversationExportSettings> | undefined,
): ConversationExportSettings {
  const d = DEFAULT_CONVERSATION_EXPORT_SETTINGS
  return {
    includeThreadIdLine:
      typeof partial?.includeThreadIdLine === "boolean"
        ? partial.includeThreadIdLine
        : d.includeThreadIdLine,
    showSpeakerLabels:
      typeof partial?.showSpeakerLabels === "boolean"
        ? partial.showSpeakerLabels
        : d.showSpeakerLabels,
    pdfBodyFontPx:
      typeof partial?.pdfBodyFontPx === "number" &&
      Number.isFinite(partial.pdfBodyFontPx) &&
      partial.pdfBodyFontPx >= 11 &&
      partial.pdfBodyFontPx <= 28
        ? Math.round(partial.pdfBodyFontPx)
        : d.pdfBodyFontPx,
    pdfLineHeight:
      typeof partial?.pdfLineHeight === "number" &&
      Number.isFinite(partial.pdfLineHeight)
        ? clampPdfLineHeight(partial.pdfLineHeight)
        : d.pdfLineHeight,
    pdfSheetMaxWidthRem:
      typeof partial?.pdfSheetMaxWidthRem === "number" &&
      Number.isFinite(partial.pdfSheetMaxWidthRem) &&
      partial.pdfSheetMaxWidthRem >= 32 &&
      partial.pdfSheetMaxWidthRem <= 52
        ? Math.round(partial.pdfSheetMaxWidthRem)
        : d.pdfSheetMaxWidthRem,
    pdfBodyMaxMeasureCh:
      typeof partial?.pdfBodyMaxMeasureCh === "number" &&
      Number.isFinite(partial.pdfBodyMaxMeasureCh) &&
      partial.pdfBodyMaxMeasureCh >= 52 &&
      partial.pdfBodyMaxMeasureCh <= 78
        ? Math.round(partial.pdfBodyMaxMeasureCh)
        : d.pdfBodyMaxMeasureCh,
    pdfFontStack: normalizePdfFontStack(partial?.pdfFontStack),
    pdfTitleScale: normalizePdfTitleScale(partial?.pdfTitleScale),
    pdfSectionGapScale: normalizePdfSectionGapScale(partial?.pdfSectionGapScale),
    pdfSectionRule: normalizePdfSectionRule(partial?.pdfSectionRule),
    pdfRoleStyle: normalizePdfRoleStyle(partial?.pdfRoleStyle),
    pdfColorScheme: normalizePdfColorScheme(partial?.pdfColorScheme),
    pdfPrintMarginMm:
      typeof partial?.pdfPrintMarginMm === "number" &&
      Number.isFinite(partial.pdfPrintMarginMm)
        ? clampPdfPrintMarginMm(partial.pdfPrintMarginMm)
        : d.pdfPrintMarginMm,
    pdfCodeScale:
      typeof partial?.pdfCodeScale === "number" && Number.isFinite(partial.pdfCodeScale)
        ? clampPdfCodeScale(partial.pdfCodeScale)
        : d.pdfCodeScale,
    pdfCodeWrap:
      typeof partial?.pdfCodeWrap === "boolean" ? partial.pdfCodeWrap : d.pdfCodeWrap,
  }
}

export function parseExportSettingsJson(raw: string | null): ConversationExportSettings {
  if (!raw) return DEFAULT_CONVERSATION_EXPORT_SETTINGS
  try {
    const o = JSON.parse(raw) as Partial<ConversationExportSettings>
    return normalizeExportSettings(o)
  } catch {
    return DEFAULT_CONVERSATION_EXPORT_SETTINGS
  }
}

export function loadExportSettings(): ConversationExportSettings {
  if (typeof window === "undefined") return DEFAULT_CONVERSATION_EXPORT_SETTINGS
  return parseExportSettingsJson(localStorage.getItem(EXPORT_SETTINGS_STORAGE_KEY))
}

export function saveExportSettings(settings: ConversationExportSettings): void {
  if (typeof window === "undefined") return
  localStorage.setItem(EXPORT_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
}
