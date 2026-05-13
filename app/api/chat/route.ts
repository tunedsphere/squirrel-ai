import { streamText } from "ai"

import type { ChatMessage } from "@/lib/chat-types"
import {
  clampModelForTier,
  getEntitlements,
} from "@/lib/entitlements"
import { pickContextWindow } from "@/lib/llm-context"
import { buildSystemPrompt } from "@/lib/llm-prompts"
import { getModel } from "@/lib/llm-provider"
import { asModelId, MODELS } from "@/lib/mock-threads"
import { checkRateLimit } from "@/lib/ratelimit"

export const runtime = "edge"

type ChatRequestBody = {
  modelId?: string
  thread?: { id?: string; systemPrompt?: string }
  messages?: ChatMessage[]
}

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

  let body: ChatRequestBody
  try {
    body = (await req.json()) as ChatRequestBody
  } catch {
    return jsonError(400, { error: "invalid_json" })
  }

  const requestedModel = body.modelId && asModelId(body.modelId)
  if (!requestedModel) {
    return jsonError(400, {
      error: "invalid_model",
      message: `modelId must be one of: ${MODELS.map((m) => m.id).join(", ")}`,
    })
  }

  const incoming = Array.isArray(body.messages) ? body.messages : []
  if (incoming.length === 0) {
    return jsonError(400, { error: "empty_messages" })
  }

  const ent = getEntitlements(req)
  const modelId = clampModelForTier(requestedModel, ent)

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

  const windowed = pickContextWindow(incoming, ent.maxContextTokens)
  if (windowed.length === 0) {
    return jsonError(400, { error: "empty_messages" })
  }

  const systemPrompt = buildSystemPrompt({
    thread: { systemPrompt: body.thread?.systemPrompt },
    modelId,
    tier: ent.tier,
  })

  const result = streamText({
    model: getModel(modelId),
    system: systemPrompt,
    messages: windowed,
    abortSignal: req.signal,
    experimental_telemetry: {
      isEnabled: true,
      metadata: {
        tier: ent.tier,
        modelId,
        route: "chat",
        threadId: body.thread?.id ?? "anon",
      },
    },
  })

  return result.toTextStreamResponse({
    headers: {
      "X-Model-Id": modelId,
      "X-Tier": ent.tier,
      "X-RateLimit-Remaining": String(limit.remaining),
    },
  })
}
