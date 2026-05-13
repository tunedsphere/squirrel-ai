import type { ChatMessage, Thread } from "@/lib/chat-types"

import { quizChatMessageToMarkdown } from "@/lib/quiz-markdown"

export function sanitizeFilename(title: string): string {
  const base = title.replace(/[/\\?%*:|"<>]/g, "-").trim()
  return base.length > 0 ? base : "chat"
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function messagePlainText(m: ChatMessage): string {
  if (m.type === "assistant-pending") return "_(pending)_"
  if (m.type === "quiz") return quizChatMessageToMarkdown(m)
  if (m.type === "assistant-error") {
    const err = `[${m.kind}] ${m.message}`
    return m.content ? `${m.content}\n\n(${err})` : err
  }
  return m.content
}

export function threadToMarkdown(thread: Thread): string {
  const lines: string[] = [`# ${thread.title}`, "", `Thread id: \`${thread.id}\``, "", "---", ""]
  for (const m of thread.messages) {
    if (m.type === "user") {
      lines.push("## User", "", m.content, "")
    } else if (m.type === "quiz") {
      lines.push("## Quiz", "", messagePlainText(m), "")
    } else {
      lines.push("## Assistant", "", messagePlainText(m), "")
    }
  }
  return lines.join("\n")
}

export function downloadTextFile(
  filename: string,
  content: string,
  mime = "text/plain;charset=utf-8",
): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.rel = "noopener"
  a.click()
  URL.revokeObjectURL(url)
}

function messageRoleLabel(m: ChatMessage): string {
  if (m.type === "user") return "User"
  if (m.type === "quiz") return "Quiz"
  return "Assistant"
}

function buildPrintHtml(thread: Thread): string {
  const parts = thread.messages.map((m) => {
    const role = escapeHtml(messageRoleLabel(m))
    const body = escapeHtml(messagePlainText(m)).replace(/\n/g, "<br/>")
    return `<section class="msg"><div class="role">${role}</div><div class="body">${body}</div></section>`
  })
  const title = escapeHtml(thread.title)
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;line-height:1.45;color:#111;max-width:40rem;margin:1.5rem auto;padding:0 1rem;}
  h1{font-size:1.25rem;margin-bottom:1rem;}
  .msg{margin:1rem 0;padding-bottom:0.75rem;border-bottom:1px solid #e5e5e5;}
  .role{font-size:0.75rem;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.35rem;}
  .body{font-size:0.95rem;white-space:pre-wrap;}
  @media print{body{margin:0;max-width:none}}
</style></head><body>
<h1>${title}</h1>
${parts.join("")}
</body></html>`
}

/** Opens a print dialog so the user can save as PDF (browser-dependent). */
export function printThreadAsPdf(thread: Thread): void {
  const html = buildPrintHtml(thread)
  const w = window.open("", "_blank")
  if (!w) return
  try {
    w.opener = null
  } catch {
    /* ignore */
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
  w.focus()
  const runPrint = () => {
    try {
      w.print()
    } catch {
      /* ignore */
    }
  }
  if (w.document.readyState === "complete") {
    window.setTimeout(runPrint, 150)
  } else {
    w.addEventListener("load", () => window.setTimeout(runPrint, 150), { once: true })
  }
}
