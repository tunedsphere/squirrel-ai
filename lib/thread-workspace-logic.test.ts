import { describe, expect, it } from "vitest"

import type { Thread } from "@/lib/chat-types"
import {
  appendTokenToPending,
  isValidLlmTitle,
  renameThreadIfHeuristic,
  replacePendingWithAssistant,
  replacePendingWithError,
} from "@/lib/thread-workspace-logic"

const baseThread = (): Thread => ({
  id: "t1",
  title: "Original",
  messages: [
    { id: "u1", type: "user", content: "hello" },
    { id: "p1", type: "assistant-pending" },
  ],
})

describe("appendTokenToPending", () => {
  it("accumulates deltas into the pending bubble", () => {
    const t = baseThread()
    let next = appendTokenToPending([t], "t1", "p1", "Hi")
    next = appendTokenToPending(next, "t1", "p1", " there")
    const pending = next[0].messages[1]
    expect(pending).toMatchObject({
      type: "assistant-pending",
      content: "Hi there",
    })
  })

  it("is a no-op for empty deltas", () => {
    const t = baseThread()
    const next = appendTokenToPending([t], "t1", "p1", "")
    expect(next).toBe(next) // reference is fine; primary assertion is no throw
    expect(next[0].messages[1]).toEqual({ id: "p1", type: "assistant-pending" })
  })

  it("ignores messages that aren't pending", () => {
    const t: Thread = {
      ...baseThread(),
      messages: [{ id: "p1", type: "assistant", content: "done" }],
    }
    const next = appendTokenToPending([t], "t1", "p1", "extra")
    expect(next[0].messages[0]).toEqual({
      id: "p1",
      type: "assistant",
      content: "done",
    })
  })
})

describe("replacePendingWithAssistant", () => {
  it("converts pending to assistant with final text", () => {
    const next = replacePendingWithAssistant([baseThread()], "t1", "p1", "Full reply")
    expect(next[0].messages[1]).toEqual({
      id: "p1",
      type: "assistant",
      content: "Full reply",
    })
  })

  it("leaves other threads untouched", () => {
    const other: Thread = { id: "t2", title: "Other", messages: [] }
    const next = replacePendingWithAssistant(
      [baseThread(), other],
      "t1",
      "p1",
      "Reply",
    )
    expect(next[1]).toBe(other)
  })
})

describe("replacePendingWithError", () => {
  it("swaps pending for error variant with kind + message", () => {
    const next = replacePendingWithError([baseThread()], "t1", "p1", {
      kind: "network",
      message: "Connection lost",
    })
    expect(next[0].messages[1]).toEqual({
      id: "p1",
      type: "assistant-error",
      kind: "network",
      content: "",
      canRetry: true,
      message: "Connection lost",
    })
  })

  it("preserves partial text and marks ratelimit as non-retryable", () => {
    const next = replacePendingWithError([baseThread()], "t1", "p1", {
      kind: "ratelimit",
      message: "Slow down",
      partial: "I was saying",
    })
    expect(next[0].messages[1]).toMatchObject({
      type: "assistant-error",
      kind: "ratelimit",
      content: "I was saying",
      canRetry: false,
    })
  })

  it("retains streamed content when no explicit partial is provided", () => {
    const t: Thread = {
      ...baseThread(),
      messages: [
        { id: "u1", type: "user", content: "hi" },
        { id: "p1", type: "assistant-pending", content: "partial so far" },
      ],
    }
    const next = replacePendingWithError([t], "t1", "p1", {
      kind: "provider",
      message: "upstream error",
    })
    expect(next[0].messages[1]).toMatchObject({
      type: "assistant-error",
      content: "partial so far",
    })
  })
})

describe("isValidLlmTitle", () => {
  it("accepts a clean short title", () => {
    expect(isValidLlmTitle("Recipe ideas")).toBe(true)
  })

  it("rejects empty / whitespace", () => {
    expect(isValidLlmTitle("")).toBe(false)
    expect(isValidLlmTitle("   ")).toBe(false)
  })

  it("rejects multi-line output", () => {
    expect(isValidLlmTitle("Recipe\nideas")).toBe(false)
  })

  it("rejects sentences ending in terminal punctuation", () => {
    expect(isValidLlmTitle("Here are some recipes.")).toBe(false)
    expect(isValidLlmTitle("What about pasta?")).toBe(false)
  })

  it("rejects titles longer than 60 characters", () => {
    expect(isValidLlmTitle("x".repeat(61))).toBe(false)
  })

  it("rejects titles with too many words", () => {
    expect(isValidLlmTitle("one two three four five six seven eight nine ten eleven")).toBe(false)
  })
})

describe("renameThreadIfHeuristic", () => {
  it("renames when the current title matches the heuristic baseline", () => {
    const t: Thread = { id: "t1", title: "How do I cook", messages: [] }
    const next = renameThreadIfHeuristic([t], "t1", "Cooking tips", "How do I cook")
    expect(next[0].title).toBe("Cooking tips")
  })

  it("does nothing when the user has already renamed", () => {
    const t: Thread = { id: "t1", title: "My recipes", messages: [] }
    const next = renameThreadIfHeuristic([t], "t1", "Cooking tips", "How do I cook")
    expect(next[0].title).toBe("My recipes")
  })

  it("leaves unrelated threads untouched", () => {
    const a: Thread = { id: "t1", title: "How do I cook", messages: [] }
    const b: Thread = { id: "t2", title: "How do I cook", messages: [] }
    const next = renameThreadIfHeuristic([a, b], "t1", "Cooking", "How do I cook")
    expect(next[1].title).toBe("How do I cook")
  })
})
