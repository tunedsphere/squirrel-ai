import { describe, expect, it } from "vitest"

import {
  EXPORT_CLIP_DRAG_MIME,
  EXPORT_PENDING_CLIP_DRAG_MIME,
  EXPORT_STAGING_SLIDE_REORDER_MIME,
  applyExportClipToDataTransfer,
  applyPendingExportClipDragToDataTransfer,
  appendExportClipToStagingMarkdown,
  consumeExportPdfGapDrop,
  countExportStagingGaps,
  dataTransferAllowsPdfGapPlacement,
  exportClipPayloadFromDataTransfer,
  formatExportClipSectionMarkdown,
  insertExportClipAtGap,
  insertExportClipAtLastGap,
  pendingExportClipIdFromDataTransfer,
  reorderExportStagingSlidesByIndex,
  stagingMarkdownMinimalExportShell,
  stagingMarkdownForPdfSelectionPreview,
} from "@/lib/conversation-export-clip"
import { THREAD_DRAG_MIME } from "@/lib/chat-constants"

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

describe("stagingMarkdownMinimalExportShell", () => {
  it("creates deck with title and divider only", () => {
    expect(stagingMarkdownMinimalExportShell("Chat")).toBe("# Chat\n\n---\n\n")
  })

  it("single gap placement target", () => {
    expect(countExportStagingGaps(stagingMarkdownMinimalExportShell("X"))).toBe(1)
  })
})

describe("pendingExportClipIdFromDataTransfer", () => {
  function mockDt(map: Record<string, string>): DataTransfer {
    return { getData: (m: string) => map[m] ?? "" } as DataTransfer
  }

  it("parses JSON id", () => {
    const dt = mockDt({
      [EXPORT_PENDING_CLIP_DRAG_MIME]: JSON.stringify({ id: "abc-1" }),
    })
    expect(pendingExportClipIdFromDataTransfer(dt)).toBe("abc-1")
  })

  it("returns null when missing", () => {
    expect(pendingExportClipIdFromDataTransfer(mockDt({}))).toBeNull()
  })
})

describe("applyPendingExportClipDragToDataTransfer", () => {
  function mockDt() {
    const store: Record<string, string> = {}
    const dt = {
      getData: (m: string) => store[m] ?? "",
      setData: (m: string, v: string) => {
        store[m] = v
      },
      effectAllowed: "uninitialized" as DataTransfer["effectAllowed"],
    } as unknown as DataTransfer
    return { dt, store }
  }

  it("sets pending id and clip payloads", () => {
    const { dt } = mockDt()
    expect(
      applyPendingExportClipDragToDataTransfer(dt, {
        id: "q1",
        excerpt: "body",
        role: "Assistant",
      }),
    ).toBe(true)
    expect(pendingExportClipIdFromDataTransfer(dt)).toBe("q1")
    expect(dt.getData(EXPORT_CLIP_DRAG_MIME)).toContain("body")
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

describe("insertExportClipAtLastGap", () => {
  it("matches insert at final gap index", () => {
    const doc = "# T\n\n## A\n\na\n\n## B\n\nb"
    const payload = { excerpt: "z" }
    const lastGap = countExportStagingGaps(doc) - 1
    expect(insertExportClipAtLastGap(doc, payload)).toBe(
      insertExportClipAtGap(doc, lastGap, payload),
    )
  })

  it("matches single-gap insert", () => {
    const doc = "# Title\n\nhello"
    const payload = { excerpt: "clip" }
    expect(insertExportClipAtLastGap(doc, payload)).toBe(insertExportClipAtGap(doc, 0, payload))
  })
})

describe("reorderExportStagingSlidesByIndex", () => {
  it("swaps adjacent slides", () => {
    const md = "# T\n\nintro\n\n## One\n\n1\n\n## Two\n\n2\n"
    const out = reorderExportStagingSlidesByIndex(md, 0, 1)
    expect(out.indexOf("## Two")).toBeLessThan(out.indexOf("## One"))
    expect(out.indexOf("intro")).toBeLessThan(out.indexOf("## Two"))
  })

  it("moves first slide to end", () => {
    const md = "# T\n\n## A\n\na\n\n## B\n\nb\n\n## C\n\nc\n"
    const out = reorderExportStagingSlidesByIndex(md, 0, 2)
    expect(out.indexOf("## B")).toBeLessThan(out.indexOf("## C"))
    expect(out.indexOf("## C")).toBeLessThan(out.indexOf("## A"))
  })

  it("returns original when fewer than two slides", () => {
    const md = "# T\n\n## Only\n\nx\n"
    expect(reorderExportStagingSlidesByIndex(md, 0, 1)).toBe(md)
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

  it("parses excerpt-only structured payload", () => {
    const dt = mockDataTransfer({
      [EXPORT_CLIP_DRAG_MIME]: JSON.stringify({ excerpt: "only text" }),
    })
    expect(exportClipPayloadFromDataTransfer(dt)).toEqual({
      excerpt: "only text",
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

describe("applyExportClipToDataTransfer", () => {
  function mockDt() {
    const map: Record<string, string> = {}
    const dt = {
      getData: (mime: string) => map[mime] ?? "",
      setData: (mime: string, v: string) => {
        map[mime] = v
      },
      effectAllowed: "uninitialized" as DataTransfer["effectAllowed"],
    } as unknown as DataTransfer
    return { dt, map }
  }

  it("returns false for empty excerpt after trim", () => {
    const { dt } = mockDt()
    expect(applyExportClipToDataTransfer(dt, { excerpt: "  \n" })).toBe(false)
  })

  it("writes plain + structured MIME with role when provided", () => {
    const { dt } = mockDt()
    expect(applyExportClipToDataTransfer(dt, { role: "Assistant", excerpt: "hi\n" })).toBe(
      true,
    )
    expect(dt.effectAllowed).toBe("copy")
    expect(dt.getData("text/plain")).toBe("hi")
    expect(JSON.parse(dt.getData(EXPORT_CLIP_DRAG_MIME))).toEqual({
      role: "Assistant",
      excerpt: "hi",
    })
  })

  it("omits role key in JSON when role missing", () => {
    const { dt } = mockDt()
    expect(applyExportClipToDataTransfer(dt, { excerpt: "x" })).toBe(true)
    expect(JSON.parse(dt.getData(EXPORT_CLIP_DRAG_MIME))).toEqual({ excerpt: "x" })
  })
})

function mockDtTypes(typesList: readonly string[]): DataTransfer {
  return {
    types: [...typesList],
    items: [],
  } as unknown as DataTransfer
}

describe("dataTransferAllowsPdfGapPlacement", () => {
  it("allows structured clip MIME", () => {
    expect(dataTransferAllowsPdfGapPlacement(mockDtTypes([EXPORT_CLIP_DRAG_MIME]))).toBe(true)
  })

  it("allows pending buffer MIME", () => {
    expect(
      dataTransferAllowsPdfGapPlacement(mockDtTypes([EXPORT_PENDING_CLIP_DRAG_MIME])),
    ).toBe(true)
  })

  it("allows text/plain excerpts", () => {
    expect(dataTransferAllowsPdfGapPlacement(mockDtTypes(["text/plain"]))).toBe(true)
  })

  it("blocks thread drags", () => {
    expect(
      dataTransferAllowsPdfGapPlacement(mockDtTypes([THREAD_DRAG_MIME, "text/plain"])),
    ).toBe(false)
  })

  it("blocks slide reorder drags", () => {
    expect(
      dataTransferAllowsPdfGapPlacement(mockDtTypes([EXPORT_STAGING_SLIDE_REORDER_MIME])),
    ).toBe(false)
  })

  it("blocks file drags", () => {
    expect(dataTransferAllowsPdfGapPlacement(mockDtTypes(["Files", "text/plain"]))).toBe(false)
  })
})

describe("consumeExportPdfGapDrop", () => {
  it("prefers pending id when MIME present", () => {
    const pendingCalls: [number, string][] = []
    const dt = {
      getData: (m: string) =>
        (
          {
            [EXPORT_PENDING_CLIP_DRAG_MIME]: JSON.stringify({ id: "x1" }),
            [EXPORT_CLIP_DRAG_MIME]: JSON.stringify({ excerpt: "body" }),
          } as Record<string, string>
        )[m] ?? "",
      types: [EXPORT_PENDING_CLIP_DRAG_MIME, EXPORT_CLIP_DRAG_MIME],
    } as unknown as DataTransfer
    const ok = consumeExportPdfGapDrop(dt, 2, {
      onGapPendingClip(g, id) {
        pendingCalls.push([g, id])
      },
      onGapClip() {
        throw new Error("should not run")
      },
    })
    expect(ok).toBe(true)
    expect(pendingCalls).toEqual([[2, "x1"]])
  })

  it("falls back to clip MIME when no pending handler", () => {
    const gaps: number[] = []
    const dt = {
      getData: (m: string) =>
        (
          {
            [EXPORT_CLIP_DRAG_MIME]: JSON.stringify({ excerpt: "hi", role: "User" }),
          } as Record<string, string>
        )[m] ?? "",
      types: [EXPORT_CLIP_DRAG_MIME],
    } as unknown as DataTransfer
    expect(
      consumeExportPdfGapDrop(dt, 0, {
        onGapClip(g) {
          gaps.push(g)
        },
      }),
    ).toBe(true)
    expect(gaps).toEqual([0])
  })
})
