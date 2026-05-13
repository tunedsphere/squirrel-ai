import type { ChatMessage } from "@/lib/chat-types"

/** Flatten user/assistant turns for quiz grounding (quiz bubbles omitted). */
export function buildQuizTranscript(
  messages: readonly ChatMessage[],
  maxChars = 14_000,
): string {
  const chunks: string[] = []
  for (const m of messages) {
    if (m.type === "user") {
      chunks.push(`User:\n${m.content.trim()}`)
    } else if (m.type === "assistant") {
      chunks.push(`Assistant:\n${m.content.trim()}`)
    }
  }
  let text = chunks.join("\n\n---\n\n")
  if (text.length > maxChars) {
    text = text.slice(text.length - maxChars)
  }
  return text.trim()
}
