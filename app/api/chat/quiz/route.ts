import { generateObject } from "ai"

import type { ChatMessage } from "@/lib/chat-types"
import { clampModelForTier, getEntitlements } from "@/lib/entitlements"
import { getModel, TITLE_MODEL_ID } from "@/lib/llm-provider"
import { asModelId } from "@/lib/mock-threads"
import { buildQuizTranscript } from "@/lib/quiz-transcript"
import { quizGenerationSchema } from "@/lib/quiz-schema"
import { checkRateLimit } from "@/lib/ratelimit"

export const runtime = "edge"

type QuizRequestBody = {
  modelId?: string
  messages?: ChatMessage[]
}

const SYSTEM = [
  "You write short quizzes based ONLY on the conversation transcript provided.",
  "Output must follow the schema exactly.",
  "Produce exactly 5 questions.",
  "Each question has exactly 4 candidate answer strings (options).",
  "Each question has pickCount: how many distinct options the learner must select (1–4).",
  "Among the 4 options, mark exactly pickCount as correct: true and the rest correct: false.",
  "Vary pickCount across questions when it makes sense (some single-answer, some select-two, etc.).",
  "Wrong options should be plausible but clearly unsupported by the transcript when possible.",
  "Do not mention that you were given a transcript.",
].join("\n")

function jsonError(
  status: number,
  body: Record<string, unknown>,
  extraHeaders?: HeadersInit,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(extraHeaders ?? {}),
    },
  })
}

export async function POST(req: Request): Promise<Response> {
  if (!process.env.AI_GATEWAY_API_KEY) {
    return jsonError(503, {
      error: "provider_not_configured",
      message:
        "AI_GATEWAY_API_KEY is not set. See .env.example for setup steps.",
    })
  }

  let body: QuizRequestBody
  try {
    body = (await req.json()) as QuizRequestBody
  } catch {
    return jsonError(400, { error: "invalid_json" })
  }

  const incoming = Array.isArray(body.messages) ? body.messages : []
  const transcript = buildQuizTranscript(incoming)
  if (!transcript) {
    return jsonError(400, {
      error: "empty_transcript",
      message: "Need user and assistant messages to build a quiz.",
    })
  }

  const requestedModel = body.modelId && asModelId(body.modelId)
  const ent = getEntitlements(req)
  const modelId = requestedModel
    ? clampModelForTier(requestedModel, ent)
    : TITLE_MODEL_ID

  const limit = await checkRateLimit(req, ent)
  if (!limit.success) {
    return jsonError(
      429,
      {
        error: "rate_limited",
        tier: ent.tier,
        resetAt: limit.reset,
        message:
          "You've hit the request limit for the free tier. Try again later, or sign in to unlock more.",
      },
      {
        "X-Tier-Hint": "anonymous-limit",
        "X-RateLimit-Remaining": "0",
      },
    )
  }

  try {
    const { object } = await generateObject({
      model: getModel(modelId),
      schema: quizGenerationSchema,
      system: SYSTEM,
      prompt: [
        "Conversation transcript:",
        transcript,
        "",
        "Create the 5-question quiz as specified.",
      ].join("\n"),
      abortSignal: req.signal,
      experimental_telemetry: {
        isEnabled: true,
        metadata: {
          route: "chat/quiz",
          modelId,
          tier: ent.tier,
        },
      },
    })

    return new Response(JSON.stringify(object), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Model-Id": modelId,
        "X-Tier": ent.tier,
        "X-RateLimit-Remaining": String(limit.remaining),
      },
    })
  } catch {
    return jsonError(502, {
      error: "upstream_failed",
      message: "Could not generate quiz. Try again.",
    })
  }
}
