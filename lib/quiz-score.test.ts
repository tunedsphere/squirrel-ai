import { describe, expect, it } from "vitest"

import type { QuizQuestionState } from "@/lib/chat-types"
import { isQuizAnswerCorrect, scoreQuizAnswers } from "@/lib/quiz-score"

describe("isQuizAnswerCorrect", () => {
  it("requires exact correct set for pickCount 1", () => {
    const q: QuizQuestionState = {
      prompt: "Q",
      pickCount: 1,
      choices: [
        { text: "a", correct: true },
        { text: "b", correct: false },
        { text: "c", correct: false },
        { text: "d", correct: false },
        { text: "I don't know", correct: false },
      ],
    }
    expect(isQuizAnswerCorrect(q, [0])).toBe(true)
    expect(isQuizAnswerCorrect(q, [1])).toBe(false)
  })

  it("matches order-insensitively for pickCount 2", () => {
    const q: QuizQuestionState = {
      prompt: "Q",
      pickCount: 2,
      choices: [
        { text: "a", correct: true },
        { text: "b", correct: true },
        { text: "c", correct: false },
        { text: "d", correct: false },
        { text: "I don't know", correct: false },
      ],
    }
    expect(isQuizAnswerCorrect(q, [1, 0])).toBe(true)
    expect(isQuizAnswerCorrect(q, [0, 2])).toBe(false)
  })
})

describe("scoreQuizAnswers", () => {
  it("counts only matching questions", () => {
    const questions: QuizQuestionState[] = [
      {
        prompt: "Q1",
        pickCount: 1,
        choices: [
          { text: "a", correct: true },
          { text: "b", correct: false },
          { text: "c", correct: false },
          { text: "d", correct: false },
          { text: "I don't know", correct: false },
        ],
      },
      {
        prompt: "Q2",
        pickCount: 1,
        choices: [
          { text: "w", correct: false },
          { text: "x", correct: true },
          { text: "y", correct: false },
          { text: "z", correct: false },
          { text: "I don't know", correct: false },
        ],
      },
    ]
    const answers: (number[] | null)[] = [[0], [0]]
    expect(scoreQuizAnswers(questions, answers)).toBe(1)
  })
})
