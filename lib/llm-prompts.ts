import type { Thread } from "@/lib/chat-types"
import type { Tier } from "@/lib/entitlements"
import type { ModelId } from "@/lib/mock-threads"

/** Persona only; always paired with {@link RESPONSE_FORMAT_PROMPT} in the default stack.  */
export const BASE_PROMPT =
  "You are ali-chat, a helpful assistant inside a chat UI. " +
  "Default to useful depth; be brief only when the user clearly asks for a short or quick answer. " +
  "Admit uncertainty plainly rather than guessing."

/**
 * Markdown and structure for rich answers (travel, lists, how-tos). Kept separate so callers
 * can reason about layers without embedded `\n\n` breaking prompt composition.
 */
export const RESPONSE_FORMAT_PROMPT =
  "Markdown and structure:\n" +
  "- Use markdown when it helps: **bold** for names and key terms, fenced code blocks for code only.\n" +
  "- For recommendations, places to visit, itineraries, comparisons, how-tos, or multi-item answers, prefer this shape " +
  "(unless they want a single terse list):\n" +
  "  • Start with 1–2 sentences of context—why this matters or what framing to use.\n" +
  "  • Use numbered sections (1., 2., 3.) grouped by theme or region; give each section a clear title on its own line " +
  "(### heading or **Title (short label)**).\n" +
  "  • Under each section, use sub-bullets for concrete picks, sights, or tips—not a flat run of 'Place: one clause' lines.\n" +
  "  • Where it adds value, end with a short **Pro tip** (logistics, timing, one memorable detail).\n" +
  "- Avoid dumping only colon-separated one-liners; give scan-friendly hierarchy and enough detail to feel joyful to read."

/** Default stack: persona + format (no per-model / per-tier layers). */
export const DEFAULT_SYSTEM_CORE = `${BASE_PROMPT}\n\n${RESPONSE_FORMAT_PROMPT}`

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
 * Per-thread override wins outright. Otherwise compose base + format + per-model +
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
    RESPONSE_FORMAT_PROMPT,
    MODEL_PROMPT_OVERRIDES[modelId] ?? "",
    TIER_PROMPT_ADDITIONS[tier] ?? "",
  ]
  return parts
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .join("\n\n")
}
