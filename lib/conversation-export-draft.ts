import type { ChatMessage, Thread } from "@/lib/chat-types"

import type { ConversationExportSettings } from "@/lib/conversation-export-settings"
import { quizChatMessageToMarkdown } from "@/lib/quiz-markdown"

function messagePlainForExport(m: ChatMessage): string {
  if (m.type === "quiz") return quizChatMessageToMarkdown(m)
  if (m.type === "assistant-pending") return "_(pending)_"
  if (m.type === "assistant-error") {
    const err = `[${m.kind}] ${m.message}`
    return m.content ? `${m.content}\n\n(${err})` : err
  }
  return m.content
}

function roleHeading(m: ChatMessage): string | null {
  if (m.type === "user") return "User"
  if (m.type === "quiz") return "Quiz"
  if (m.type === "assistant" || m.type === "assistant-pending") return "Assistant"
  if (m.type === "assistant-error") return "Assistant"
  return null
}

export function threadToExportDraftMarkdown(
  thread: Thread,
  s: ConversationExportSettings,
): string {
  const lines: string[] = [`# ${thread.title}`, ``]
  if (s.includeThreadIdLine) {
    lines.push(`Thread id: \`${thread.id}\``, ``)
  }
  lines.push(`---`, ``)
  for (const m of thread.messages) {
    if (s.showSpeakerLabels && roleHeading(m)) {
      lines.push(`## ${roleHeading(m)}`, ``)
      lines.push(messagePlainForExport(m), ``)
      continue
    }
    lines.push(messagePlainForExport(m), ``)
  }
  return lines.join("\n").trimEnd()
}
