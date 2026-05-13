import { describe, expect, it } from "vitest"

import {
  formatQuizPickSummary,
  quizChoiceLetter,
} from "@/lib/quiz-choice-label"

describe("quizChoiceLetter", () => {
  it("maps 0–25 to A–Z", () => {
    expect(quizChoiceLetter(0)).toBe("A")
    expect(quizChoiceLetter(3)).toBe("D")
    expect(quizChoiceLetter(25)).toBe("Z")
  })

  it("falls back past Z", () => {
    expect(quizChoiceLetter(26)).toBe("27")
    expect(quizChoiceLetter(27)).toBe("28")
  })
})

describe("formatQuizPickSummary", () => {
  it("joins labeled picks", () => {
    const choices = [{ text: "one" }, { text: "two" }, { text: "three" }]
    expect(formatQuizPickSummary(choices, [0, 2])).toBe(
      "A. one; C. three",
    )
  })
})
