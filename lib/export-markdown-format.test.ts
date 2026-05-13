import { describe, expect, it } from "vitest";

import {
  exportMarkdownLineToBlockHtml,
  filterExportPreambleLines,
  isExportSpeakerRoleTitle,
  renderExportInlineMarkdownToHtml,
  sanitizeExportDeckTitle,
  stripExportMarkdownToPlain,
} from "@/lib/export-markdown-format";

describe("isExportSpeakerRoleTitle", () => {
  it("detects speaker-only titles after stripping markdown", () => {
    expect(isExportSpeakerRoleTitle("User")).toBe(true)
    expect(isExportSpeakerRoleTitle("Assistant")).toBe(true)
    expect(isExportSpeakerRoleTitle("**User**")).toBe(true)
    expect(isExportSpeakerRoleTitle("Real heading")).toBe(false)
    expect(isExportSpeakerRoleTitle("User notes")).toBe(false)
  })
})

describe("sanitizeExportDeckTitle", () => {
  it("strips junk punctuation prefixes", () => {
    expect(sanitizeExportDeckTitle(":; Alpine Hiking")).toBe("Alpine Hiking");
  });
});

describe("filterExportPreambleLines", () => {
  it("drops thread id lines only", () => {
    expect(
      filterExportPreambleLines(["Thread id: `8848b0cf`", "Real note"]),
    ).toEqual(["Real note"]);
    expect(filterExportPreambleLines(["Thread id: 8848b0cf"])).toEqual([]);
  });
});

describe("renderExportInlineMarkdownToHtml", () => {
  it("handles bold italic and code", () => {
    expect(renderExportInlineMarkdownToHtml("**Lingering Snow:** cold")).toContain(
      "<strong>Lingering Snow:</strong>",
    );
    expect(renderExportInlineMarkdownToHtml("*soft*")).toContain("<em>soft</em>");
    expect(renderExportInlineMarkdownToHtml("`uuid`")).toContain(
      "<code class=\"export-code\">uuid</code>",
    );
  });
});

describe("exportMarkdownLineToBlockHtml", () => {
  it("turns ### into a subheading element", () => {
    const html = exportMarkdownLineToBlockHtml("### Early Summer Hiking");
    expect(html).toMatch(/^<h3 class="export-md-h">/);
    expect(html).toContain("Early Summer Hiking");
  });
});

describe("stripExportMarkdownToPlain", () => {
  it("strips common markers", () => {
    expect(stripExportMarkdownToPlain("**Bold** and *it*")).toBe("Bold and it");
    expect(stripExportMarkdownToPlain("### Heading")).toBe("Heading");
  });
});
