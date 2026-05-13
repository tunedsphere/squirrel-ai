import type { ChatMessage } from "@/lib/chat-types"
import { describe, expect, it } from "vitest"

import { buildQuizTranscript } from "@/lib/quiz-transcript"

describe("buildQuizTranscript", () => {
  it("includes only user and assistant text in order", () => {
    const messages: ChatMessage[] = [
      { id: "1", type: "user", content: "Hello" },
      { id: "2", type: "assistant", content: "Hi there" },
      {
        id: "3",
        type: "quiz",
        status: "complete",
        questions: [],
        currentIndex: 0,
        answers: [null, null, null, null, null],
        scoreCorrect: 0,
      },
    ]
    const t = buildQuizTranscript(messages)
    expect(t).toContain("User:")
    expect(t).toContain("Hello")
    expect(t).toContain("Assistant:")
    expect(t).toContain("Hi there")
    expect(t).not.toContain("quiz")
  })

  it("truncates from the start when over maxChars", () => {
    const long = "x".repeat(100)
    const messages: ChatMessage[] = [
      { id: "1", type: "user", content: `A${long}` },
      { id: "2", type: "user", content: `B${long}` },
    ]
    const t = buildQuizTranscript(messages, 120)
    expect(t.length).toBeLessThanOrEqual(120)
    expect(t).toContain("B")
  })
})
