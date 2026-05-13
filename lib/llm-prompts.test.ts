import { afterEach, describe, expect, it } from "vitest"

import {
  BASE_PROMPT,
  MODEL_PROMPT_OVERRIDES,
  TIER_PROMPT_ADDITIONS,
  buildSystemPrompt,
} from "@/lib/llm-prompts"

describe("buildSystemPrompt", () => {
  afterEach(() => {
    for (const key of Object.keys(MODEL_PROMPT_OVERRIDES)) {
      delete (MODEL_PROMPT_OVERRIDES as Record<string, string>)[key]
    }
    for (const key of Object.keys(TIER_PROMPT_ADDITIONS)) {
      delete (TIER_PROMPT_ADDITIONS as Record<string, string>)[key]
    }
  })

  it("returns just the base when nothing else is configured", () => {
    const out = buildSystemPrompt({
      thread: {},
      modelId: "gemini-flash",
      tier: "anonymous",
    })
    expect(out).toBe(BASE_PROMPT)
  })

  it("appends per-model overrides under the base", () => {
    MODEL_PROMPT_OVERRIDES["kimi-k2"] = "Be extra concise."
    const out = buildSystemPrompt({
      thread: {},
      modelId: "kimi-k2",
      tier: "anonymous",
    })
    expect(out).toBe(`${BASE_PROMPT}\n\nBe extra concise.`)
  })

  it("appends per-tier additions", () => {
    TIER_PROMPT_ADDITIONS["premium"] = "You may use tool calls."
    const out = buildSystemPrompt({
      thread: {},
      modelId: "gemini-flash",
      tier: "premium",
    })
    expect(out).toBe(`${BASE_PROMPT}\n\nYou may use tool calls.`)
  })

  it("composes base + model + tier in order", () => {
    MODEL_PROMPT_OVERRIDES["deepseek-chat"] = "Prefer step-by-step reasoning."
    TIER_PROMPT_ADDITIONS["free-signed-in"] = "Reply in the user's language."
    const out = buildSystemPrompt({
      thread: {},
      modelId: "deepseek-chat",
      tier: "free-signed-in",
    })
    expect(out.split("\n\n")).toEqual([
      BASE_PROMPT,
      "Prefer step-by-step reasoning.",
      "Reply in the user's language.",
    ])
  })

  it("per-thread override wins all other layers", () => {
    MODEL_PROMPT_OVERRIDES["kimi-k2"] = "ignored"
    TIER_PROMPT_ADDITIONS["premium"] = "ignored"
    const out = buildSystemPrompt({
      thread: { systemPrompt: "You are a pirate." },
      modelId: "kimi-k2",
      tier: "premium",
    })
    expect(out).toBe("You are a pirate.")
  })

  it("ignores whitespace-only thread override", () => {
    const out = buildSystemPrompt({
      thread: { systemPrompt: "   \n  " },
      modelId: "gemini-flash",
      tier: "anonymous",
    })
    expect(out).toBe(BASE_PROMPT)
  })
})
