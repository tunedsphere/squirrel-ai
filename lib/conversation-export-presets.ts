import {
  DEFAULT_CONVERSATION_EXPORT_SETTINGS,
  normalizeExportSettings,
  type ConversationExportSettings,
} from "@/lib/conversation-export-settings"

export type ExportPresetCategory =
  | "quick_start"
  | "typography"
  | "font"
  | "sections"
  | "appearance"
  | "print"
  | "code"
  | "draft"

export type ExportAxisPreset = {
  id: string
  title: string
  patch: Partial<ConversationExportSettings>
  boxClassName: string
}

export type TypographyPresetId =
  | "typography_default"
  | "typography_reader"
  | "typography_compact"
  | "typography_deck"

export type FontPresetId = "font_default" | "font_serif"

export type AppearancePresetId =
  | "appearance_default"
  | "appearance_high_contrast"
  | "appearance_print_black"

export type PrintPresetId = "print_default" | "print_comfortable" | "print_wide"

export type SectionsPresetId =
  | "sections_default"
  | "sections_spacious"
  | "sections_clean"
  | "sections_minimal_labels"
  | "sections_hidden_titles"

export type CodePresetId = "code_default" | "code_developer"

export type DraftPresetId = "draft_standard" | "draft_minimal"

export type AxisSelections = {
  typography: TypographyPresetId
  font: FontPresetId
  sections: SectionsPresetId
  appearance: AppearancePresetId
  print: PrintPresetId
  code: CodePresetId
  draft: DraftPresetId
}

export type ExportQuickStartPresetId =
  | "quick_balanced"
  | "quick_long_read"
  | "quick_slide_deck"
  | "quick_dense_handoff"
  | "quick_accessible_print"
  | "quick_archive_bundle"

export type ExportQuickStartPreset = {
  id: ExportQuickStartPresetId
  title: string
  subtitle: string
  axisSnapshot: AxisSelections
  boxClassName: string
}

export const EXPORT_QUICK_START_DEFAULT_ID: ExportQuickStartPresetId =
  "quick_balanced"

export const EXPORT_PRESET_SECTION_ORDER: readonly ExportPresetCategory[] = [
  "quick_start",
  "typography",
  "font",
  "sections",
  "appearance",
  "print",
  "code",
  "draft",
] as const

export const EXPORT_PRESET_CATEGORY_LABELS: Record<ExportPresetCategory, string> =
  {
    quick_start: "Quick start",
    typography: "Typography",
    font: "Font",
    sections: "Sections and labels",
    appearance: "Appearance",
    print: "Print",
    code: "Code",
    draft: "Draft defaults",
  }

export const CATEGORY_AXIS_KEY: Partial<
  Record<ExportPresetCategory, keyof AxisSelections>
> = {
  typography: "typography",
  font: "font",
  sections: "sections",
  appearance: "appearance",
  print: "print",
  code: "code",
  draft: "draft",
}

export const TYPOGRAPHY_AXIS_PRESETS: readonly ExportAxisPreset[] = [
  {
    id: "typography_default",
    title: "Default",
    patch: {
      pdfBodyFontPx: DEFAULT_CONVERSATION_EXPORT_SETTINGS.pdfBodyFontPx,
      pdfLineHeight: DEFAULT_CONVERSATION_EXPORT_SETTINGS.pdfLineHeight,
      pdfSheetMaxWidthRem: DEFAULT_CONVERSATION_EXPORT_SETTINGS.pdfSheetMaxWidthRem,
      pdfBodyMaxMeasureCh: DEFAULT_CONVERSATION_EXPORT_SETTINGS.pdfBodyMaxMeasureCh,
      pdfTitleScale: DEFAULT_CONVERSATION_EXPORT_SETTINGS.pdfTitleScale,
    },
    boxClassName:
      "rounded-lg border-2 border-border bg-background shadow-sm transition-colors",
  },
  {
    id: "typography_reader",
    title: "Reader",
    patch: {
      pdfBodyFontPx: 17,
      pdfLineHeight: 1.58,
      pdfBodyMaxMeasureCh: 68,
    },
    boxClassName:
      "rounded-xl border border-primary/30 bg-gradient-to-br from-primary/[0.07] to-transparent shadow-sm transition-colors",
  },
  {
    id: "typography_compact",
    title: "Compact",
    patch: {
      pdfBodyFontPx: 13,
      pdfLineHeight: 1.48,
      pdfBodyMaxMeasureCh: 56,
    },
    boxClassName:
      "rounded-md border border-dashed border-muted-foreground/45 bg-muted/25 shadow-inner transition-colors",
  },
  {
    id: "typography_deck",
    title: "Deck",
    patch: {
      pdfTitleScale: "deck",
      pdfBodyFontPx: 17,
      pdfSheetMaxWidthRem: 46,
    },
    boxClassName:
      "rounded-lg bg-muted/45 shadow-md ring-2 ring-primary/35 ring-offset-2 ring-offset-background transition-colors",
  },
] as const

export const FONT_AXIS_PRESETS: readonly ExportAxisPreset[] = [
  {
    id: "font_default",
    title: "Sans (UI)",
    patch: { pdfFontStack: "sans" },
    boxClassName:
      "rounded-lg border border-border bg-card shadow-sm transition-colors",
  },
  {
    id: "font_serif",
    title: "Serif",
    patch: { pdfFontStack: "serif" },
    boxClassName:
      "rounded-xl border border-amber-800/25 bg-gradient-to-br from-amber-500/[0.06] to-transparent shadow-sm transition-colors",
  },
] as const

export const SECTIONS_AXIS_PRESETS: readonly ExportAxisPreset[] = [
  {
    id: "sections_default",
    title: "Standard",
    patch: {
      pdfSectionGapScale: "normal",
      pdfSectionRule: "hairline",
      pdfRoleStyle: "ribbon",
    },
    boxClassName:
      "rounded-lg border-2 border-border bg-background shadow-sm transition-colors",
  },
  {
    id: "sections_spacious",
    title: "Spacious",
    patch: {
      pdfSectionGapScale: "roomy",
      pdfSectionRule: "hairline",
      pdfRoleStyle: "ribbon",
    },
    boxClassName:
      "rounded-xl border border-sky-500/25 bg-gradient-to-br from-sky-500/[0.06] to-transparent shadow-sm transition-colors",
  },
  {
    id: "sections_clean",
    title: "Clean breaks",
    patch: {
      pdfSectionGapScale: "compact",
      pdfSectionRule: "none",
      pdfRoleStyle: "ribbon",
    },
    boxClassName:
      "rounded-lg border border-dashed border-emerald-500/35 bg-emerald-500/[0.04] transition-colors",
  },
  {
    id: "sections_minimal_labels",
    title: "Minimal labels",
    patch: {
      pdfSectionGapScale: "normal",
      pdfSectionRule: "hairline",
      pdfRoleStyle: "minimal",
    },
    boxClassName:
      "rounded-md border border-foreground/20 bg-muted/30 shadow-inner transition-colors",
  },
  {
    id: "sections_hidden_titles",
    title: "Hide slide titles",
    patch: {
      pdfSectionGapScale: "normal",
      pdfSectionRule: "hairline",
      pdfRoleStyle: "hidden",
    },
    boxClassName:
      "rounded-2xl border-2 border-muted-foreground/30 bg-card shadow-inner transition-colors",
  },
] as const

export const APPEARANCE_AXIS_PRESETS: readonly ExportAxisPreset[] = [
  {
    id: "appearance_default",
    title: "Default",
    patch: { pdfColorScheme: "default" },
    boxClassName:
      "rounded-lg border border-border bg-background shadow-sm transition-colors",
  },
  {
    id: "appearance_high_contrast",
    title: "High contrast",
    patch: { pdfColorScheme: "high_contrast" },
    boxClassName:
      "rounded-md border-2 border-foreground/40 bg-background shadow-sm transition-colors",
  },
  {
    id: "appearance_print_black",
    title: "Print black",
    patch: { pdfColorScheme: "print_black" },
    boxClassName:
      "rounded-sm border border-border bg-muted/50 shadow-none ring-1 ring-border transition-colors",
  },
] as const

export const PRINT_AXIS_PRESETS: readonly ExportAxisPreset[] = [
  {
    id: "print_default",
    title: "Standard",
    patch: { pdfPrintMarginMm: 12 },
    boxClassName:
      "rounded-md border border-border bg-muted/25 transition-colors",
  },
  {
    id: "print_comfortable",
    title: "Comfortable",
    patch: { pdfPrintMarginMm: 14 },
    boxClassName:
      "rounded-lg border border-primary/25 bg-background shadow-sm transition-colors",
  },
  {
    id: "print_wide",
    title: "Wide margins",
    patch: { pdfPrintMarginMm: 22 },
    boxClassName:
      "rounded-lg border-b-[3px] border-primary/35 bg-background shadow-md transition-colors",
  },
] as const

export const CODE_AXIS_PRESETS: readonly ExportAxisPreset[] = [
  {
    id: "code_default",
    title: "Standard",
    patch: { pdfCodeScale: 1, pdfCodeWrap: false },
    boxClassName:
      "rounded-lg border border-border bg-card shadow-sm transition-colors",
  },
  {
    id: "code_developer",
    title: "Developer",
    patch: { pdfCodeScale: 0.88, pdfCodeWrap: true },
    boxClassName:
      "rounded-md border border-violet-500/30 bg-violet-500/[0.05] transition-colors",
  },
] as const

export const DRAFT_AXIS_PRESETS: readonly ExportAxisPreset[] = [
  {
    id: "draft_standard",
    title: "Full metadata",
    patch: {
      includeThreadIdLine: DEFAULT_CONVERSATION_EXPORT_SETTINGS.includeThreadIdLine,
      showSpeakerLabels: DEFAULT_CONVERSATION_EXPORT_SETTINGS.showSpeakerLabels,
    },
    boxClassName:
      "rounded-md border-double border-[3px] border-foreground/25 bg-muted/35 transition-colors",
  },
  {
    id: "draft_minimal",
    title: "Minimal draft",
    patch: {
      includeThreadIdLine: false,
      showSpeakerLabels: false,
    },
    boxClassName:
      "rounded-md border border-dashed border-muted-foreground/40 bg-muted/20 transition-colors",
  },
] as const

export const DEFAULT_AXIS_SELECTIONS: AxisSelections = {
  typography: "typography_default",
  font: "font_default",
  sections: "sections_default",
  appearance: "appearance_default",
  print: "print_default",
  code: "code_default",
  draft: "draft_standard",
}

function patchById(
  presets: readonly ExportAxisPreset[],
  id: string,
): Partial<ConversationExportSettings> {
  return presets.find((p) => p.id === id)?.patch ?? {}
}

/**
 * Overlay axis patches onto baseline (saved export settings).
 * Merge order: typography → font → sections → appearance → print → code → draft.
 */
export function mergeExportSettingsFromAxes(
  baseline: ConversationExportSettings,
  axes: AxisSelections,
): ConversationExportSettings {
  return normalizeExportSettings({
    ...baseline,
    ...patchById(TYPOGRAPHY_AXIS_PRESETS, axes.typography),
    ...patchById(FONT_AXIS_PRESETS, axes.font),
    ...patchById(SECTIONS_AXIS_PRESETS, axes.sections),
    ...patchById(APPEARANCE_AXIS_PRESETS, axes.appearance),
    ...patchById(PRINT_AXIS_PRESETS, axes.print),
    ...patchById(CODE_AXIS_PRESETS, axes.code),
    ...patchById(DRAFT_AXIS_PRESETS, axes.draft),
  })
}

export const EXPORT_QUICK_START_PRESETS: readonly ExportQuickStartPreset[] = [
  {
    id: "quick_balanced",
    title: "Balanced",
    subtitle: "Defaults across typography, font, and layout",
    axisSnapshot: DEFAULT_AXIS_SELECTIONS,
    boxClassName:
      "rounded-lg border-2 border-border bg-background shadow-sm transition-colors",
  },
  {
    id: "quick_long_read",
    title: "Long read",
    subtitle: "Serif + reader sizing + roomy sections",
    axisSnapshot: {
      typography: "typography_reader",
      font: "font_serif",
      sections: "sections_spacious",
      appearance: "appearance_default",
      print: "print_default",
      code: "code_default",
      draft: "draft_standard",
    },
    boxClassName:
      "rounded-xl border border-amber-800/25 bg-gradient-to-br from-amber-500/[0.06] to-transparent shadow-sm transition-colors",
  },
  {
    id: "quick_slide_deck",
    title: "Slide deck",
    subtitle: "Large deck title + sans + wide sheet",
    axisSnapshot: {
      typography: "typography_deck",
      font: "font_default",
      sections: "sections_default",
      appearance: "appearance_default",
      print: "print_default",
      code: "code_default",
      draft: "draft_standard",
    },
    boxClassName:
      "rounded-lg bg-muted/45 shadow-md ring-2 ring-primary/35 ring-offset-2 ring-offset-background transition-colors",
  },
  {
    id: "quick_dense_handoff",
    title: "Dense handoff",
    subtitle: "Compact type + tight breaks + dev code",
    axisSnapshot: {
      typography: "typography_compact",
      font: "font_default",
      sections: "sections_clean",
      appearance: "appearance_default",
      print: "print_default",
      code: "code_developer",
      draft: "draft_minimal",
    },
    boxClassName:
      "rounded-md border border-dashed border-muted-foreground/45 bg-muted/25 shadow-inner transition-colors",
  },
  {
    id: "quick_accessible_print",
    title: "Accessible print",
    subtitle: "High contrast palette + comfortable margins",
    axisSnapshot: {
      typography: "typography_default",
      font: "font_default",
      sections: "sections_default",
      appearance: "appearance_high_contrast",
      print: "print_comfortable",
      code: "code_default",
      draft: "draft_standard",
    },
    boxClassName:
      "rounded-md border-2 border-foreground/40 bg-background shadow-sm transition-colors",
  },
  {
    id: "quick_archive_bundle",
    title: "Archive bundle",
    subtitle: "Reader body + print-black + wide margins + full draft",
    axisSnapshot: {
      typography: "typography_reader",
      font: "font_serif",
      sections: "sections_spacious",
      appearance: "appearance_print_black",
      print: "print_wide",
      code: "code_default",
      draft: "draft_standard",
    },
    boxClassName:
      "rounded-md border-double border-[3px] border-foreground/25 bg-muted/35 transition-colors",
  },
] as const

/**
 * Merge saved baseline with a preset patch and clamp via normalizeExportSettings.
 */
export function applyExportPresetPatch(
  baseline: ConversationExportSettings,
  patch: Partial<ConversationExportSettings>,
): ConversationExportSettings {
  return normalizeExportSettings({ ...baseline, ...patch })
}

export function presetsForCategory(
  category: ExportPresetCategory,
): readonly ExportAxisPreset[] | readonly ExportQuickStartPreset[] {
  switch (category) {
    case "quick_start":
      return EXPORT_QUICK_START_PRESETS
    case "typography":
      return TYPOGRAPHY_AXIS_PRESETS
    case "font":
      return FONT_AXIS_PRESETS
    case "sections":
      return SECTIONS_AXIS_PRESETS
    case "appearance":
      return APPEARANCE_AXIS_PRESETS
    case "print":
      return PRINT_AXIS_PRESETS
    case "code":
      return CODE_AXIS_PRESETS
    case "draft":
      return DRAFT_AXIS_PRESETS
  }
}

export function findQuickStartById(
  id: ExportQuickStartPresetId,
): ExportQuickStartPreset | undefined {
  return EXPORT_QUICK_START_PRESETS.find((p) => p.id === id)
}
