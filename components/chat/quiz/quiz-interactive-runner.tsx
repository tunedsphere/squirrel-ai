"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import type { QuizQuestionState } from "@/lib/chat-types"
import { quizChoiceLetter } from "@/lib/quiz-choice-label"
import { scoreQuizAnswers } from "@/lib/quiz-score"
import { cn } from "@/lib/utils"

export type QuizInteractiveRunnerProps = {
  questions: QuizQuestionState[]
  onFinished: (answers: (number[] | null)[], scoreCorrect: number) => void
}

function emptyAnswers(len: number): (number[] | null)[] {
  return Array.from({ length: len }, () => null)
}

export function QuizInteractiveRunner({
  questions,
  onFinished,
}: QuizInteractiveRunnerProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [selected, setSelected] = React.useState<Set<number>>(() => new Set())
  const [reveal, setReveal] = React.useState(false)
  const answersRef = React.useRef<(number[] | null)[]>(
    emptyAnswers(questions.length),
  )
  const timeoutRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current != null) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [currentIndex])

  const advanceAfterReveal = React.useCallback(
    (chosenSorted: number[]) => {
      if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current)
      const idx = currentIndex
      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null
        answersRef.current[idx] = [...chosenSorted]
        const last = idx >= questions.length - 1
        if (last) {
          const snapshot = [...answersRef.current]
          const score = scoreQuizAnswers(questions, snapshot)
          onFinished(snapshot, score)
        } else {
          setCurrentIndex((i) => i + 1)
          setReveal(false)
          setSelected(new Set())
        }
      }, 420)
    },
    [currentIndex, onFinished, questions],
  )

  const onPick = React.useCallback(
    (index: number) => {
      if (reveal) return
      const q = questions[currentIndex]
      if (!q) return

      setSelected((prev) => {
        let next = new Set(prev)
        if (q.pickCount === 1) {
          next = new Set([index])
        } else {
          if (next.has(index)) next.delete(index)
          else if (next.size < q.pickCount) next.add(index)
        }

        if (next.size === q.pickCount) {
          const chosenSorted = [...next].sort((a, b) => a - b)
          window.requestAnimationFrame(() => {
            setReveal(true)
            advanceAfterReveal(chosenSorted)
          })
        }

        return next
      })
    },
    [advanceAfterReveal, currentIndex, questions, reveal],
  )

  const q = questions[currentIndex]
  if (!q) return null

  const step = currentIndex + 1
  const totalSteps = questions.length

  return (
    <div className="flex min-h-0 w-full flex-col gap-2">
      <p className="text-muted-foreground mb-1 text-sm font-medium tabular-nums">
        Question {step} of {totalSteps}
      </p>

      <div
        key={currentIndex}
        className={cn(
          "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-300 motion-safe:ease-out motion-safe:fill-mode-both",
        )}
      >
        <p
          className="font-medium leading-snug break-words text-foreground"
          aria-live="polite"
        >
          {q.prompt}
        </p>
        <p className="text-muted-foreground mt-2 text-sm">
          Select {q.pickCount}{" "}
          {q.pickCount === 1 ? "answer" : "answers"}
        </p>

        <div className="mt-4 flex flex-col gap-2">
          {q.choices.map((choice, ix) => {
            const letter = quizChoiceLetter(ix)
            const isSel = selected.has(ix)
            const showTruth = reveal
            const btnClass = cn(
              "gap-3 text-left text-sm font-medium leading-snug break-words transition-colors duration-200",
              "rounded-xl border px-3 py-2.5 min-h-[2.75rem]",
              showTruth &&
                choice.correct &&
                "border-emerald-500/70 bg-emerald-500/10",
              showTruth &&
                isSel &&
                !choice.correct &&
                "border-destructive/70 bg-destructive/10",
              showTruth &&
                !isSel &&
                !choice.correct &&
                "border-border/60 opacity-80",
              !showTruth &&
                isSel &&
                "border-primary/45 bg-primary/[0.07]",
              !showTruth &&
                !isSel &&
                "border-border bg-transparent hover:bg-muted/40 dark:hover:bg-muted/25",
            )
            return (
              <Button
                key={ix}
                type="button"
                variant="ghost"
                disabled={reveal}
                className={cn(
                  btnClass,
                  "h-auto justify-start whitespace-normal shadow-none",
                )}
                aria-label={`Option ${letter}: ${choice.text}`}
                onClick={() => onPick(ix)}
              >
                <span
                  className="text-muted-foreground w-7 shrink-0 font-semibold tabular-nums"
                  aria-hidden
                >
                  {letter}.
                </span>
                <span className="min-w-0 flex-1">{choice.text}</span>
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
