import { describe, expect, it } from "vitest"

import {
  EXPORT_CLIP_DRAG_MIME,
  appendExportClipToStagingMarkdown,
  countExportStagingGaps,
  exportClipPayloadFromDataTransfer,
  formatExportClipSectionMarkdown,
  insertExportClipAtGap,
  stagingMarkdownForPdfSelectionPreview,
} from "@/lib/conversation-export-clip"

describe("formatExportClipSectionMarkdown", () => {
  it("builds ## Clip slide with role", () => {
    expect(formatExportClipSectionMarkdown({ role: "User", excerpt: "hello" })).toBe(
      "\n\n## Clip (User)\n\nhello\n\n",
    )
  })

  it("omits role when absent", () => {
    expect(formatExportClipSectionMarkdown({ excerpt: "x" })).toBe("\n\n## Clip\n\nx\n\n")
  })

  it("returns empty for whitespace excerpt", () => {
    expect(formatExportClipSectionMarkdown({ excerpt: "  \n  " })).toBe("")
  })

  it("preserves internal newlines", () => {
    expect(formatExportClipSectionMarkdown({ excerpt: "a\nb" })).toBe("\n\n## Clip\n\na\nb\n\n")
  })
})

describe("appendExportClipToStagingMarkdown", () => {
  it("appends after trimmed staging", () => {
    expect(
      appendExportClipToStagingMarkdown("# T\n\nhello", {
        role: "Assistant",
        excerpt: "quoted",
      }),
    ).toBe("# T\n\nhello\n\n## Clip (Assistant)\n\nquoted\n\n")
  })
})

describe("stagingMarkdownForPdfSelectionPreview", () => {
  it("builds title preamble and Selection heading", () => {
    expect(stagingMarkdownForPdfSelectionPreview("My chat", "hello world")).toBe(
      "# My chat\n\n---\n\n## Selection\n\nhello world\n",
    )
  })

  it("includes role in heading when provided", () => {
    expect(stagingMarkdownForPdfSelectionPreview("T", "x", "User")).toBe(
      "# T\n\n---\n\n## Selection (User)\n\nx\n",
    )
  })
})

describe("countExportStagingGaps", () => {
  it("single gap when no slide headings", () => {
    expect(countExportStagingGaps("# Title\n\nhello")).toBe(1)
  })

  it("n plus one gaps for n slides", () => {
    expect(countExportStagingGaps("# T\n\n## A\n\na\n\n## B\n\nb")).toBe(3)
  })
})

describe("insertExportClipAtGap", () => {
  const payload = { excerpt: "z" }
  const doc = "# T\n\n## A\n\na\n\n## B\n\nb"

  it("gap 0 inserts before first slide heading", () => {
    const out = insertExportClipAtGap(doc, 0, payload)
    expect(out.indexOf("## Clip")).toBeLessThan(out.indexOf("## A"))
  })

  it("middle gap inserts before second slide", () => {
    const out = insertExportClipAtGap(doc, 1, payload)
    expect(out.indexOf("## A")).toBeLessThan(out.indexOf("## Clip"))
    expect(out.indexOf("## Clip")).toBeLessThan(out.indexOf("## B"))
  })

  it("last gap appends after final slide", () => {
    const out = insertExportClipAtGap(doc, 99, payload)
    expect(out.lastIndexOf("## Clip")).toBeGreaterThan(out.lastIndexOf("## B"))
    expect(out.endsWith("z")).toBe(true)
  })
})

describe("exportClipPayloadFromDataTransfer", () => {
  function mockDataTransfer(map: Record<string, string>): DataTransfer {
    return {
      getData: (mime: string) => map[mime] ?? "",
    } as DataTransfer
  }

  it("prefers structured MIME", () => {
    const dt = mockDataTransfer({
      "text/plain": "ignored",
      [EXPORT_CLIP_DRAG_MIME]: JSON.stringify({
        role: "User",
        excerpt: "keep me",
      }),
    })
    expect(exportClipPayloadFromDataTransfer(dt)).toEqual({
      role: "User",
      excerpt: "keep me",
    })
  })

  it("falls back to text/plain", () => {
    const dt = mockDataTransfer({ "text/plain": "plain only" })
    expect(exportClipPayloadFromDataTransfer(dt)).toEqual({ excerpt: "plain only" })
  })

  it("returns null when empty", () => {
    const dt = mockDataTransfer({})
    expect(exportClipPayloadFromDataTransfer(dt)).toBeNull()
  })
})
