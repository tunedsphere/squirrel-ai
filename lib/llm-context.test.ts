import { describe, expect, it } from "vitest"

import type { ChatMessage } from "@/lib/chat-types"
import { estimateTokens, pickContextWindow } from "@/lib/llm-context"

const u = (id: string, content: string): ChatMessage => ({
  id,
  type: "user",
  content,
})
const a = (id: string, content: string): ChatMessage => ({
  id,
  type: "assistant",
  content,
})
const pending = (id: string): ChatMessage => ({ id, type: "assistant-pending" })

describe("estimateTokens", () => {
  it("returns 0 for empty input", () => {
    expect(estimateTokens("")).toBe(0)
  })

  it("approximates roughly chars/4", () => {
    expect(estimateTokens("hello")).toBe(2)
    expect(estimateTokens("hello world!!!!")).toBe(4)
  })
})

describe("pickContextWindow", () => {
  it("returns empty array when no messages", () => {
    expect(pickContextWindow([], 1000)).toEqual([])
  })

  it("keeps a single message when it fits", () => {
    const msgs = [u("1", "hi")]
    expect(pickContextWindow(msgs, 1000)).toEqual([
      { role: "user", content: "hi" },
    ])
  })

  it("strips assistant-pending placeholders", () => {
    const msgs = [u("1", "hi"), pending("2")]
    expect(pickContextWindow(msgs, 1000)).toEqual([
      { role: "user", content: "hi" },
    ])
  })

  it("returns messages oldest-first", () => {
    const msgs = [u("1", "first"), a("2", "reply"), u("3", "second")]
    const out = pickContextWindow(msgs, 1000)
    expect(out.map((m) => m.content)).toEqual(["first", "reply", "second"])
  })

  it("drops oldest messages when over budget", () => {
    const long = "x".repeat(400) // ~100 tokens
    const msgs = [u("1", long), a("2", long), u("3", long), u("4", "tail")]
    const out = pickContextWindow(msgs, 110)
    expect(out[out.length - 1]).toEqual({ role: "user", content: "tail" })
    expect(out.length).toBeLessThan(msgs.length)
  })

  it("always keeps the latest message even if it alone exceeds the budget", () => {
    const huge = "y".repeat(10_000)
    const msgs = [u("1", "old"), u("2", huge)]
    const out = pickContextWindow(msgs, 50)
    expect(out).toHaveLength(1)
    expect(out[0]).toEqual({ role: "user", content: huge })
  })
})
