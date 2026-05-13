import type { ChatMessage } from "@/lib/chat-types"

/** True once the thread has at least one finalized assistant bubble (not `assistant-pending`). */
export function threadHasComposerExportableAssistantResponse(
  messages: ChatMessage[],
): boolean {
  return messages.some(
    (m) => m.type === "assistant" || m.type === "assistant-error",
  )
}
