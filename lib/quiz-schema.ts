import { z } from "zod"

const quizApiOptionSchema = z.object({
  text: z.string().min(1),
  correct: z.boolean(),
})

export const quizApiQuestionSchema = z
  .object({
    prompt: z.string().min(1),
    pickCount: z.number().int().min(1).max(4),
    options: z.array(quizApiOptionSchema).length(4),
  })
  .superRefine((q, ctx) => {
    const nCorrect = q.options.filter((o) => o.correct).length
    if (nCorrect !== q.pickCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Exactly ${q.pickCount} options must be marked correct (got ${nCorrect}).`,
      })
    }
  })

export const quizGenerationSchema = z.object({
  questions: z.array(quizApiQuestionSchema).length(5),
})

export type QuizGenerationPayload = z.infer<typeof quizGenerationSchema>
