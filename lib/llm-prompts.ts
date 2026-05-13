import type { Thread } from "@/lib/chat-types"
import type { Tier } from "@/lib/entitlements"
import type { ModelId } from "@/lib/mock-threads"

/** Always applied. Edit here to retune the product-wide persona. */
export const BASE_PROMPT =
  "You are ali-chat, a helpful assistant inside a chat UI. " +
  "Be concise. Use markdown sparingly and prefer fenced code blocks for code. " +
  "Admit uncertainty plainly rather than guessing."

/**
 * Per-model nudges. Empty by default — populate an entry only when a model
 * misbehaves in a way the base prompt cannot fix.
 */
export const MODEL_PROMPT_OVERRIDES: Partial<Record<ModelId, string>> = {}

/**
 * Per-tier additions. Empty by default — populate when premium features
 * (e.g. tool use) need to be announced to the model.
 */
export const TIER_PROMPT_ADDITIONS: Partial<Record<Tier, string>> = {}

export type BuildSystemPromptArgs = {
  thread: Pick<Thread, "systemPrompt">
  modelId: ModelId
  tier: Tier
}

/**
 * Per-thread override wins outright. Otherwise compose base + per-model +
 * per-tier in priority order, dropping empty layers.
 */
export function buildSystemPrompt({
  thread,
  modelId,
  tier,
}: BuildSystemPromptArgs): string {
  if (thread.systemPrompt && thread.systemPrompt.trim().length > 0) {
    return thread.systemPrompt.trim()
  }
  const parts = [
    BASE_PROMPT,
    MODEL_PROMPT_OVERRIDES[modelId] ?? "",
    TIER_PROMPT_ADDITIONS[tier] ?? "",
  ]
  return parts
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .join("\n\n")
}
