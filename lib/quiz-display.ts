import type { QuizChoice, QuizQuestionState } from "@/lib/chat-types"
import { QUIZ_DONT_KNOW_LABEL } from "@/lib/quiz-constants"
import type { QuizGenerationPayload } from "@/lib/quiz-schema"

/** Fisher–Yates shuffle (copy). */
export function shuffleArray<T>(items: readonly T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = copy[i]
    copy[i] = copy[j]!
    copy[j] = tmp!
  }
  return copy
}

/** Shuffle the four API options; append fixed “I don’t know” last. */
export function shuffleFourAppendDontKnow(options: QuizChoice[]): QuizChoice[] {
  const four = shuffleArray(options)
  return [...four, { text: QUIZ_DONT_KNOW_LABEL, correct: false }]
}

/** Turn API payload into per-question display state (shuffled each time). */
export function quizQuestionsFromGeneration(
  payload: QuizGenerationPayload,
): QuizQuestionState[] {
  return payload.questions.map((q) => ({
    prompt: q.prompt,
    pickCount: q.pickCount,
    choices: shuffleFourAppendDontKnow([...q.options]),
  }))
}
