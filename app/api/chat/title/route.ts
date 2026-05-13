import { generateText } from "ai"

import { getModel, TITLE_MODEL_ID } from "@/lib/llm-provider"

export const runtime = "edge"

type TitleRequestBody = {
  userText?: string
  assistantText?: string
}

const SYSTEM =
  "You generate concise, descriptive titles for chat threads. " +
  "Return ONLY the title — 3 to 6 words, no quotes, no trailing punctuation, " +
  "no newlines, no preamble."

function jsonError(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function clip(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max)
}

export async function POST(req: Request): Promise<Response> {
  if (!process.env.AI_GATEWAY_API_KEY) {
    return jsonError(503, { error: "provider_not_configured" })
  }

  let body: TitleRequestBody
  try {
    body = (await req.json()) as TitleRequestBody
  } catch {
    return jsonError(400, { error: "invalid_json" })
  }

  const userText = typeof body.userText === "string" ? body.userText.trim() : ""
  const assistantText =
    typeof body.assistantText === "string" ? body.assistantText.trim() : ""
  if (!userText) return jsonError(400, { error: "empty_user_text" })

  // Cap inputs to keep the title call cheap regardless of conversation length.
  const userExcerpt = clip(userText, 800)
  const assistantExcerpt = clip(assistantText, 800)

  try {
    const { text } = await generateText({
      model: getModel(TITLE_MODEL_ID),
      system: SYSTEM,
      prompt: [
        "User asked:",
        userExcerpt,
        "",
        "Assistant replied:",
        assistantExcerpt,
        "",
        "Title:",
      ].join("\n"),
      abortSignal: req.signal,
      experimental_telemetry: {
        isEnabled: true,
        metadata: { route: "chat/title", modelId: TITLE_MODEL_ID },
      },
    })

    const title = text.trim().replace(/^["'`]|["'`]$/g, "").replace(/[.!?]+$/, "")
    return new Response(JSON.stringify({ title }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch {
    return jsonError(502, { error: "upstream_failed" })
  }
}
