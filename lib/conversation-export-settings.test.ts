import { describe, expect, it } from "vitest";

import {
  DEFAULT_CONVERSATION_EXPORT_SETTINGS,
  normalizeExportSettings,
} from "@/lib/conversation-export-settings";

describe("normalizeExportSettings", () => {
  it("fills defaults when partial is undefined", () => {
    expect(normalizeExportSettings(undefined)).toEqual(
      DEFAULT_CONVERSATION_EXPORT_SETTINGS,
    );
  });

  it("clamps pdfPrintMarginMm", () => {
    expect(normalizeExportSettings({ pdfPrintMarginMm: 2 })).toMatchObject({
      pdfPrintMarginMm: 6,
    });
    expect(normalizeExportSettings({ pdfPrintMarginMm: 99 })).toMatchObject({
      pdfPrintMarginMm: 28,
    });
  });

  it("clamps pdfCodeScale", () => {
    expect(normalizeExportSettings({ pdfCodeScale: 0.2 })).toMatchObject({
      pdfCodeScale: 0.8,
    });
    expect(normalizeExportSettings({ pdfCodeScale: 9 })).toMatchObject({
      pdfCodeScale: 1.15,
    });
  });

  it("normalizes enum-like pdf fields", () => {
    expect(
      normalizeExportSettings({
        pdfFontStack: "serif",
        pdfTitleScale: "deck",
        pdfSectionGapScale: "roomy",
        pdfSectionRule: "none",
        pdfRoleStyle: "hidden",
        pdfColorScheme: "high_contrast",
      }),
    ).toMatchObject({
      pdfFontStack: "serif",
      pdfTitleScale: "deck",
      pdfSectionGapScale: "roomy",
      pdfSectionRule: "none",
      pdfRoleStyle: "hidden",
      pdfColorScheme: "high_contrast",
    });

    expect(
      normalizeExportSettings({
        pdfFontStack: "bogus" as never,
        pdfTitleScale: "bogus" as never,
      }),
    ).toMatchObject({
      pdfFontStack: "sans",
      pdfTitleScale: "normal",
    });
  });
});
