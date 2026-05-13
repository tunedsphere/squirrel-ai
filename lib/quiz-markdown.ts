import type { QuizChatMessage } from "@/lib/chat-types"
import { formatQuizPickSummary } from "@/lib/quiz-choice-label"
import { isQuizAnswerCorrect } from "@/lib/quiz-score"

/** Plain markdown for exports / downloads for a quiz bubble. */
export function quizChatMessageToMarkdown(m: QuizChatMessage): string {
  if (m.status === "generating") {
    return "_Quiz generating…_"
  }
  if (m.status === "error") {
    return `**Quiz**\n\n${m.errorMessage ?? "Quiz failed."}`
  }
  if (m.status === "in_progress") {
    const lines = ["## Quiz", "", "_In progress…_", ""]
    for (let i = 0; i < m.questions.length; i++) {
      const q = m.questions[i]
      if (!q) continue
      lines.push(`### Question ${i + 1}`, q.prompt, "")
      const ans = m.answers[i]
      if (ans?.length) {
        lines.push(
          `_Your picks:_ ${formatQuizPickSummary(q.choices, ans)}`,
          "",
        )
      }
    }
    return lines.join("\n").trimEnd()
  }

  const score = m.scoreCorrect ?? 0
  const pct = Math.round((score / m.questions.length) * 100)
  const lines: string[] = [
    "## Quiz",
    "",
    `**Your performance:** ${score}/${m.questions.length} (${pct}%)`,
    "",
  ]

  for (let i = 0; i < m.questions.length; i++) {
    const q = m.questions[i]!
    const ans = m.answers[i]
    const ok = ans ? isQuizAnswerCorrect(q, ans) : false
    lines.push(
      `### Question ${i + 1}${ok ? " — Correct" : " — Incorrect"}`,
      q.prompt,
      "",
    )
    if (ans?.length) {
      lines.push(
        `Your picks: ${formatQuizPickSummary(q.choices, ans)}`,
        "",
      )
    }
    const correctLabels = q.choices
      .filter((c) => c.correct)
      .map((c) => c.text)
    lines.push(`Correct answer(s): ${correctLabels.join("; ")}`, "")
  }

  return lines.join("\n").trimEnd()
}
