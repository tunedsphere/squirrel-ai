"use client"

import { Nut } from "lucide-react"

import { cn } from "@/lib/utils"

const NUT_ROTATIONS = ["-14deg", "10deg", "-8deg"] as const

export type QuizLoadingCardsProps = {
  className?: string
}

/** Decorative conveyor animation while quiz questions load (respects prefers-reduced-motion in CSS). */
export function QuizLoadingCards({ className }: QuizLoadingCardsProps) {
  return (
    <div className={cn("quiz-loading-cards", className)} aria-hidden>
      {NUT_ROTATIONS.map((rotation, index) => (
        <div key={index} className="quiz-loading-cards__card">
          <Nut
            className="quiz-loading-cards__nut shrink-0"
            strokeWidth={2}
            aria-hidden
            style={{ rotate: rotation }}
          />
        </div>
      ))}
    </div>
  )
}
