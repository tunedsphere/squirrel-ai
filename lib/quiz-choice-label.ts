/** Letter label for multiple-choice row index (0 → A … 25 → Z; beyond → numeric fallbacks). */
export function quizChoiceLetter(index: number): string {
  if (index >= 0 && index < 26) return String.fromCharCode(65 + index)
  return String(index + 1)
}

/** "A. Foo; B. Bar" for thread summaries and exports (matches interactive runner labels). */
export function formatQuizPickSummary(
  choices: readonly { text: string }[],
  pickedIndices: readonly number[],
): string {
  return pickedIndices
    .map((ix) => `${quizChoiceLetter(ix)}. ${choices[ix]?.text ?? ""}`)
    .join("; ")
}
