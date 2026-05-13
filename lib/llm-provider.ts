import { gateway } from "@ai-sdk/gateway"
import type { LanguageModel } from "ai"

import type { ModelId } from "@/lib/mock-threads"

/**
 * Vercel AI Gateway model identifiers, keyed by our internal ModelId.
 * Format: `<provider>/<model>` — see https://vercel.com/ai-gateway/models.
 *
 * All three resolve through the same Gateway with BYOK credentials configured
 * in the Vercel project settings, so swapping the upstream version is a single
 * string change.
 */
const GATEWAY_MODEL_BY_ID: Record<ModelId, string> = {
  "gemini-flash": "google/gemini-2.5-flash",
  "deepseek-chat": "deepseek/deepseek-v3.1",
  "kimi-k2": "moonshotai/kimi-k2",
}

/** Resolve our internal ModelId to a configured AI SDK LanguageModel. */
export function getModel(modelId: ModelId): LanguageModel {
  const gatewayId = GATEWAY_MODEL_BY_ID[modelId]
  return gateway(gatewayId)
}

/** Gemini Flash is always cheapest; reserved for utility calls (titles, etc.). */
export const TITLE_MODEL_ID = "gemini-flash" as const satisfies ModelId
