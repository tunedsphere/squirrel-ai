"use client"

import * as React from "react"
import { BrainCircuit } from "lucide-react"

import { QuizInteractiveRunner } from "./quiz-interactive-runner"
import { QuizLoadingCards } from "./quiz-loading-cards"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type {
  ChatMessage,
  QuizChatMessage,
  QuizQuestionState,
} from "@/lib/chat-types"
import type { ModelId } from "@/lib/mock-threads"
import { quizQuestionsFromGeneration } from "@/lib/quiz-display"
import { quizGenerationSchema } from "@/lib/quiz-schema"
import { cn } from "@/lib/utils"

type Phase = "loading" | "error" | "active"

export type QuizSessionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  threadId: string
  transcriptMessages: ChatMessage[]
  modelId: ModelId
  onQuizCompleted: (threadId: string, message: QuizChatMessage) => void
}

function buildCompletedQuizMessage(
  questions: QuizQuestionState[],
  answers: (number[] | null)[],
  scoreCorrect: number,
): QuizChatMessage {
  return {
    id: crypto.randomUUID(),
    type: "quiz",
    status: "complete",
    questions,
    currentIndex: Math.max(0, questions.length - 1),
    answers,
    scoreCorrect,
  }
}

function QuizLoadingState() {
  return (
    <div
      className="flex min-h-[18.5rem] flex-col items-center justify-center gap-6 py-6"
      aria-busy="true"
      aria-label="Generating quiz questions"
      role="status"
    >
      <QuizLoadingCards className="w-full max-w-none sm:max-w-md" />
      <p className="text-muted-foreground text-sm">Writing questions…</p>
    </div>
  )
}

export function QuizSessionDialog({
  open,
  onOpenChange,
  threadId,
  transcriptMessages,
  modelId,
  onQuizCompleted,
}: QuizSessionDialogProps) {
  const [phase, setPhase] = React.useState<Phase>("loading")
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [questions, setQuestions] = React.useState<QuizQuestionState[]>([])
  const questionsRef = React.useRef<QuizQuestionState[]>([])

  React.useEffect(() => {
    questionsRef.current = questions
  }, [questions])

  React.useEffect(() => {
    if (!open || !threadId) return

    let cancelled = false

    void (async () => {
      try {
        const res = await fetch("/api/chat/quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modelId, messages: transcriptMessages }),
        })
        const payload: unknown = await res.json().catch(() => null)
        if (cancelled) return
        if (!res.ok) {
          const msg =
            payload &&
            typeof payload === "object" &&
            "message" in payload &&
            typeof (payload as { message: unknown }).message === "string"
              ? (payload as { message: string }).message
              : `Quiz failed (${res.status}).`
          setErrorMessage(msg)
          setPhase("error")
          return
        }
        const parsed = quizGenerationSchema.safeParse(payload)
        if (!parsed.success) {
          setErrorMessage("Quiz response was invalid. Try again.")
          setPhase("error")
          return
        }
        const nextQuestions = quizQuestionsFromGeneration(parsed.data)
        setQuestions(nextQuestions)
        setPhase("active")
      } catch {
        if (!cancelled) {
          setErrorMessage("Network error. Try again.")
          setPhase("error")
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, threadId, modelId, transcriptMessages])

  const handleFinished = React.useCallback(
    (answers: (number[] | null)[], scoreCorrect: number) => {
      const msg = buildCompletedQuizMessage(
        questionsRef.current,
        answers,
        scoreCorrect,
      )
      onQuizCompleted(threadId, msg)
    },
    [onQuizCompleted, threadId],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        overlayClassName={cn(
          "quiz-session-overlay backdrop-blur-xl",
          "bg-[color-mix(in_oklch,var(--background)_96%,oklch(0.35_0_0))]",
          "dark:bg-[color-mix(in_oklch,var(--background)_93%,oklch(0.05_0_0))]",
        )}
        className={cn(
          "flex max-h-[min(92dvh,44rem)] w-[calc(100%-1.75rem)] max-w-lg flex-col gap-0 overflow-hidden sm:max-w-xl",
          "border-border bg-popover shadow-2xl ring-1 ring-foreground/10",
        )}
      >
        {phase !== "active" ? (
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <BrainCircuit className="size-5 shrink-0 text-primary" aria-hidden />
              Quiz
            </DialogTitle>
          </DialogHeader>
        ) : (
          <DialogTitle className="sr-only">Quiz</DialogTitle>
        )}

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto px-5 pb-5",
            phase === "active" && "pt-10",
          )}
        >
          {phase === "loading" ? (
            <QuizLoadingState />
          ) : phase === "error" ? (
            <div className="py-2" role="alert">
              <p className="font-medium text-destructive">
                Could not start quiz
              </p>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {errorMessage}
              </p>
              <Button
                type="button"
                className="mt-5"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </div>
          ) : questions.length > 0 ? (
            <QuizInteractiveRunner
              key={threadId}
              questions={questions}
              onFinished={handleFinished}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
