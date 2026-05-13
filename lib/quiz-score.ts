import type { QuizQuestionState } from "@/lib/chat-types"

export function correctChoiceIndices(q: QuizQuestionState): number[] {
  return q.choices
    .map((c, i) => (c.correct ? i : null))
    .filter((i): i is number => i !== null)
}

/** True iff selection matches the correct index set exactly (order-independent). */
export function isQuizAnswerCorrect(
  q: QuizQuestionState,
  selected: readonly number[],
): boolean {
  if (selected.length !== q.pickCount) return false
  const uniq = new Set(selected)
  if (uniq.size !== selected.length) return false
  const correct = [...correctChoiceIndices(q)].sort((a, b) => a - b)
  const sel = [...selected].sort((a, b) => a - b)
  if (correct.length !== q.pickCount) return false
  return correct.every((v, i) => v === sel[i])
}

export function scoreQuizAnswers(
  questions: QuizQuestionState[],
  answers: (readonly number[] | null)[],
): number {
  let n = 0
  for (let i = 0; i < questions.length; i++) {
    const sel = answers[i]
    if (!sel) continue
    if (isQuizAnswerCorrect(questions[i]!, sel)) n++
  }
  return n
}
