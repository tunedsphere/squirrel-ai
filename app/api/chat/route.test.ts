import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ChatMessage } from "@/lib/chat-types"

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  for (const k of Object.keys(process.env)) {
    if (
      k.startsWith("AI_GATEWAY_") ||
      k.startsWith("KV_") ||
      k.startsWith("TIER_")
    ) {
      delete process.env[k]
    }
  }
  vi.resetModules()
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

async function importRoute() {
  // Late import so env mutation above takes effect.
  const mod = await import("@/app/api/chat/route")
  return mod
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/chat", () => {
  it("returns 503 provider_not_configured when AI_GATEWAY_API_KEY is missing", async () => {
    const { POST } = await importRoute()
    const res = await POST(
      makeRequest({
        modelId: "gemini-flash",
        thread: { id: "t1" },
        messages: [{ id: "u1", type: "user", content: "hi" }] as ChatMessage[],
      }),
    )
    expect(res.status).toBe(503)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toBe("provider_not_configured")
  })

  it("returns 400 on invalid JSON", async () => {
    process.env.AI_GATEWAY_API_KEY = "dummy"
    const { POST } = await importRoute()
    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "this is not json",
      }),
    )
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toBe("invalid_json")
  })

  it("returns 400 on unknown modelId", async () => {
    process.env.AI_GATEWAY_API_KEY = "dummy"
    const { POST } = await importRoute()
    const res = await POST(
      makeRequest({
        modelId: "gpt-5-imaginary",
        thread: { id: "t1" },
        messages: [{ id: "u1", type: "user", content: "hi" }],
      }),
    )
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toBe("invalid_model")
  })

  it("returns 400 when messages array is empty", async () => {
    process.env.AI_GATEWAY_API_KEY = "dummy"
    const { POST } = await importRoute()
    const res = await POST(
      makeRequest({
        modelId: "gemini-flash",
        thread: { id: "t1" },
        messages: [],
      }),
    )
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toBe("empty_messages")
  })
})
