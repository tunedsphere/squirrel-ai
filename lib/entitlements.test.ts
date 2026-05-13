import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  applyOverrides,
  clampModelForTier,
  getEntitlements,
  getTierEntitlements,
  parseModelList,
  type Entitlements,
} from "@/lib/entitlements"

const baseEnv = { ...process.env }

beforeEach(() => {
  for (const k of Object.keys(process.env)) {
    if (k.startsWith("TIER_")) delete process.env[k]
  }
})

afterEach(() => {
  process.env = { ...baseEnv }
})

describe("parseModelList", () => {
  it("returns null for undefined", () => {
    expect(parseModelList(undefined)).toBeNull()
  })

  it("drops unknown ids and trims whitespace", () => {
    expect(parseModelList(" gemini-flash , unknown ,kimi-k2 ")).toEqual([
      "gemini-flash",
      "kimi-k2",
    ])
  })

  it("returns null when every entry is unknown", () => {
    expect(parseModelList("foo,bar")).toBeNull()
  })
})

describe("applyOverrides", () => {
  const base: Entitlements = {
    tier: "anonymous",
    maxContextTokens: 16_000,
    allowedModelIds: ["gemini-flash"],
    maxRequestsPerHour: 50,
    maxThreads: 20,
  }

  it("returns the base unchanged when overrides are empty", () => {
    expect(applyOverrides(base, {})).toEqual(base)
  })

  it("applies each override independently", () => {
    const result = applyOverrides(base, { ctx: 8000, rph: 10 })
    expect(result.maxContextTokens).toBe(8000)
    expect(result.maxRequestsPerHour).toBe(10)
    expect(result.maxThreads).toBe(20)
    expect(result.allowedModelIds).toEqual(["gemini-flash"])
  })
})

describe("getTierEntitlements", () => {
  it("returns defaults when no env overrides", () => {
    const ent = getTierEntitlements("anonymous")
    expect(ent.tier).toBe("anonymous")
    expect(ent.maxContextTokens).toBe(16_000)
    expect(ent.maxRequestsPerHour).toBe(50)
  })

  it("respects TIER_ANON_* overrides", () => {
    process.env.TIER_ANON_CTX = "4000"
    process.env.TIER_ANON_RPH = "10"
    process.env.TIER_ANON_MODELS = "gemini-flash"
    const ent = getTierEntitlements("anonymous")
    expect(ent.maxContextTokens).toBe(4000)
    expect(ent.maxRequestsPerHour).toBe(10)
    expect(ent.allowedModelIds).toEqual(["gemini-flash"])
  })

  it("ignores negative or non-numeric env values", () => {
    process.env.TIER_ANON_CTX = "-5"
    process.env.TIER_ANON_RPH = "not-a-number"
    const ent = getTierEntitlements("anonymous")
    expect(ent.maxContextTokens).toBe(16_000)
    expect(ent.maxRequestsPerHour).toBe(50)
  })
})

describe("getEntitlements", () => {
  it("returns anonymous for any request (pre-M4)", () => {
    const req = new Request("http://localhost/api/chat")
    expect(getEntitlements(req).tier).toBe("anonymous")
  })
})

describe("clampModelForTier", () => {
  const anon: Entitlements = {
    tier: "anonymous",
    maxContextTokens: 16_000,
    allowedModelIds: ["gemini-flash"],
    maxRequestsPerHour: 50,
    maxThreads: 20,
  }

  it("returns requested model when allowed", () => {
    expect(clampModelForTier("gemini-flash", anon)).toBe("gemini-flash")
  })

  it("falls back to first allowed model when requested is blocked", () => {
    expect(clampModelForTier("kimi-k2", anon)).toBe("gemini-flash")
  })
})
