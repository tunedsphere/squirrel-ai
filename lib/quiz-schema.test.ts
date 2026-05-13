import { describe, expect, it } from "vitest"

import { quizGenerationSchema } from "@/lib/quiz-schema"

function mkQuestion(prompt: string, pickCount: number) {
  const opts =
    pickCount === 1
      ? [
          { text: "A right", correct: true },
          { text: "B", correct: false },
          { text: "C", correct: false },
          { text: "D", correct: false },
        ]
      : [
          { text: "A right", correct: true },
          { text: "B right", correct: true },
          { text: "C", correct: false },
          { text: "D", correct: false },
        ]
  return { prompt, pickCount, options: opts }
}

describe("quizGenerationSchema", () => {
  it("accepts five questions when pickCount matches correct flags", () => {
    const payload = {
      questions: [
        mkQuestion("q1", 1),
        mkQuestion("q2", 2),
        mkQuestion("q3", 1),
        mkQuestion("q4", 2),
        mkQuestion("q5", 1),
      ],
    }
    const parsed = quizGenerationSchema.safeParse(payload)
    expect(parsed.success).toBe(true)
  })

  it("rejects wrong correct count", () => {
    const payload = {
      questions: [
        {
          prompt: "bad",
          pickCount: 2,
          options: [
            { text: "a", correct: true },
            { text: "b", correct: false },
            { text: "c", correct: false },
            { text: "d", correct: false },
          ],
        },
        mkQuestion("q2", 1),
        mkQuestion("q3", 1),
        mkQuestion("q4", 1),
        mkQuestion("q5", 1),
      ],
    }
    expect(quizGenerationSchema.safeParse(payload).success).toBe(false)
  })
})
