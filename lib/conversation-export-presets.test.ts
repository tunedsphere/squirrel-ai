import { describe, expect, it } from "vitest";

import {
  applyExportPresetPatch,
  DEFAULT_AXIS_SELECTIONS,
  EXPORT_QUICK_START_PRESETS,
  mergeExportSettingsFromAxes,
  TYPOGRAPHY_AXIS_PRESETS,
} from "@/lib/conversation-export-presets";
import type { ConversationExportSettings } from "@/lib/conversation-export-settings";

describe("applyExportPresetPatch", () => {
  const base: ConversationExportSettings = {
    includeThreadIdLine: false,
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
  };

  it("merges patch and preserves unspecified fields", () => {
    const r = applyExportPresetPatch(base, { pdfBodyFontPx: 17 });
    expect(r.includeThreadIdLine).toBe(false);
    expect(r.showSpeakerLabels).toBe(true);
    expect(r.pdfBodyFontPx).toBe(17);
    expect(r.pdfFontStack).toBe("sans");
  });

  it("clamps invalid font sizes via normalizeExportSettings", () => {
    const r = applyExportPresetPatch(base, { pdfBodyFontPx: 999 });
    expect(r.pdfBodyFontPx).toBe(15);
  });

  it("can toggle booleans from patch", () => {
    const r = applyExportPresetPatch(base, {
      includeThreadIdLine: true,
      showSpeakerLabels: false,
    });
    expect(r.includeThreadIdLine).toBe(true);
    expect(r.showSpeakerLabels).toBe(false);
  });

  it("applies palette and margin patches", () => {
    const r = applyExportPresetPatch(base, {
      pdfColorScheme: "print_black",
      pdfPrintMarginMm: 20,
    });
    expect(r.pdfColorScheme).toBe("print_black");
    expect(r.pdfPrintMarginMm).toBe(20);
  });
});

describe("mergeExportSettingsFromAxes", () => {
  const base: ConversationExportSettings = {
    includeThreadIdLine: false,
    showSpeakerLabels: false,
    pdfBodyFontPx: 12,
    pdfLineHeight: 1.4,
    pdfSheetMaxWidthRem: 40,
    pdfBodyMaxMeasureCh: 60,
    pdfFontStack: "sans",
    pdfTitleScale: "normal",
    pdfSectionGapScale: "compact",
    pdfSectionRule: "none",
    pdfRoleStyle: "hidden",
    pdfColorScheme: "print_black",
    pdfPrintMarginMm: 22,
    pdfCodeScale: 0.88,
    pdfCodeWrap: true,
  };

  it("combines independent axes (typography + appearance + font)", () => {
    const axes = {
      ...DEFAULT_AXIS_SELECTIONS,
      typography: "typography_reader" as const,
      appearance: "appearance_high_contrast" as const,
      font: "font_serif" as const,
      draft: "draft_minimal" as const,
    };
    const r = mergeExportSettingsFromAxes(base, axes);
    expect(r.pdfBodyFontPx).toBe(17);
    expect(r.pdfColorScheme).toBe("high_contrast");
    expect(r.pdfFontStack).toBe("serif");
    expect(r.includeThreadIdLine).toBe(false);
  });

  it("lets typography default reset deck-oriented fields when layered last in merge order", () => {
    const axesDeck = {
      ...DEFAULT_AXIS_SELECTIONS,
      typography: "typography_deck" as const,
    };
    const mergedDeck = mergeExportSettingsFromAxes(base, axesDeck);
    expect(mergedDeck.pdfTitleScale).toBe("deck");

    const axesDefault = {
      ...DEFAULT_AXIS_SELECTIONS,
      typography: "typography_default" as const,
    };
    const mergedBack = mergeExportSettingsFromAxes(base, axesDefault);
    expect(mergedBack.pdfTitleScale).toBe("normal");
  });
});

describe("EXPORT_QUICK_START_PRESETS", () => {
  it("has six quick-start combos with unique ids", () => {
    const ids = EXPORT_QUICK_START_PRESETS.map((p) => p.id);
    expect(ids.length).toBe(6);
    expect(new Set(ids).size).toBe(6);
  });

  it("balanced preset matches default axis snapshot", () => {
    const balanced = EXPORT_QUICK_START_PRESETS.find((p) => p.id === "quick_balanced");
    expect(balanced?.axisSnapshot).toEqual(DEFAULT_AXIS_SELECTIONS);
  });
});

describe("TYPOGRAPHY_AXIS_PRESETS", () => {
  it("has unique ids", () => {
    const ids = TYPOGRAPHY_AXIS_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
