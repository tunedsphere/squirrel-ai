"use client"

import { BrainCircuit, Check, X } from "lucide-react"

import type { QuizChatMessage } from "@/lib/chat-types"
import { formatQuizPickSummary } from "@/lib/quiz-choice-label"
import { isQuizAnswerCorrect } from "@/lib/quiz-score"
import { cn } from "@/lib/utils"

const shellClass = cn(
  "w-full max-w-3xl rounded-3xl bg-muted/40 px-5 py-5 sm:px-6 sm:py-6 dark:bg-muted/18",
  "text-base leading-[1.7] tracking-wide text-foreground/88 dark:text-foreground/76",
)

export type QuizMessageProps = {
  message: QuizChatMessage
}

/** Thread bubble for a finished quiz (interactive flow uses QuizSessionDialog). */
export function QuizMessage({ message }: QuizMessageProps) {
  if (message.status === "error") {
    return (
      <div className="inline-flex max-w-3xl min-w-0 flex-col">
        <div
          className={cn(
            shellClass,
            "border border-destructive/35 bg-destructive/[0.06]",
          )}
          role="alert"
        >
          <div className="flex items-center gap-2 font-medium text-destructive">
            <X className="size-4 shrink-0" aria-hidden />
            Quiz could not load
          </div>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            {message.errorMessage ??
              "Something went wrong. Try again from the composer menu."}
          </p>
        </div>
      </div>
    )
  }

  if (message.status === "complete") {
    const total = message.questions.length || 5
    const score = message.scoreCorrect ?? 0
    const pct = total ? Math.round((score / total) * 100) : 0
    return (
      <div className="inline-flex max-w-3xl min-w-0 flex-col gap-3">
        <div className={shellClass}>
          <div className="mb-4 flex items-center gap-2 font-semibold text-foreground">
            <BrainCircuit className="size-5 shrink-0 text-primary" aria-hidden />
            Quiz complete
          </div>
          <p className="text-lg font-medium tracking-tight">
            Your performance: {score}/{total} ({pct}%)
          </p>
          <ul className="mt-4 space-y-3 text-sm">
            {message.questions.map((q, i) => {
              const ans = message.answers[i]
              const ok = ans ? isQuizAnswerCorrect(q, ans) : false
              return (
                <li
                  key={i}
                  className="border-border/80 rounded-xl border bg-background/40 px-3 py-2.5"
                >
                  <div className="flex items-start gap-2">
                    {ok ? (
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                        aria-hidden
                      />
                    ) : (
                      <X
                        className="mt-0.5 size-4 shrink-0 text-destructive"
                        aria-hidden
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium leading-snug">{q.prompt}</p>
                      {ans?.length ? (
                        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                          Your picks:{" "}
                          {formatQuizPickSummary(q.choices, ans)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    )
  }

  return null
}
