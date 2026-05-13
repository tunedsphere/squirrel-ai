import type { ChatMessage } from "@/lib/chat-types"

/** Approximate but cheap; good enough for clamping (4 chars ≈ 1 token). */
export function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / 4)
}

/**
 * Public message shape the route handler forwards to the AI SDK.
 * `assistant-pending` and `assistant-error` are workspace-local; we strip them
 * here so the model never sees placeholder bubbles.
 */
export type ApiChatMessage = {
  role: "user" | "assistant"
  content: string
}

function messageToApi(m: ChatMessage): ApiChatMessage | null {
  if (m.type === "user") return { role: "user", content: m.content }
  if (m.type === "assistant") return { role: "assistant", content: m.content }
  return null
}

/**
 * Walk `messages` from newest to oldest, accepting each message while the
 * running token estimate fits the budget. The latest user message is always
 * kept even if it alone exceeds the budget — the caller is expected to surface
 * a friendly error in that case rather than silently dropping it.
 *
 * Returned messages are in chronological order (oldest first), suitable for
 * direct use with `streamText({ messages })`.
 */
export function pickContextWindow(
  messages: readonly ChatMessage[],
  budgetTokens: number,
): ApiChatMessage[] {
  const usable: ApiChatMessage[] = []
  let used = 0
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messageToApi(messages[i])
    if (!m) continue
    const cost = estimateTokens(m.content) + 4
    if (usable.length > 0 && used + cost > budgetTokens) break
    usable.push(m)
    used += cost
  }
  return usable.reverse()
}
