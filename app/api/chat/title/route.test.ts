import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  for (const k of Object.keys(process.env)) {
    if (k.startsWith("AI_GATEWAY_")) delete process.env[k]
  }
  vi.resetModules()
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

async function importRoute() {
  return await import("@/app/api/chat/title/route")
}

describe("POST /api/chat/title", () => {
  it("returns 503 when AI_GATEWAY_API_KEY is missing", async () => {
    const { POST } = await importRoute()
    const res = await POST(
      new Request("http://localhost/api/chat/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userText: "hello", assistantText: "hi" }),
      }),
    )
    expect(res.status).toBe(503)
  })

  it("returns 400 on empty userText", async () => {
    process.env.AI_GATEWAY_API_KEY = "dummy"
    const { POST } = await importRoute()
    const res = await POST(
      new Request("http://localhost/api/chat/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userText: "", assistantText: "hi" }),
      }),
    )
    expect(res.status).toBe(400)
  })

  it("returns 400 on invalid JSON", async () => {
    process.env.AI_GATEWAY_API_KEY = "dummy"
    const { POST } = await importRoute()
    const res = await POST(
      new Request("http://localhost/api/chat/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ not json",
      }),
    )
    expect(res.status).toBe(400)
  })
})
