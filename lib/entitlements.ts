import { asModelId, getModelMeta, MODELS, type ModelId } from "@/lib/mock-threads"

export type Tier = "anonymous" | "free-signed-in" | "premium"

export type Entitlements = {
  tier: Tier
  maxContextTokens: number
  allowedModelIds: readonly ModelId[]
  maxRequestsPerHour: number
  /** `0` means unlimited. */
  maxThreads: number
}

export type EntitlementOverrides = Partial<{
  ctx: number
  models: readonly ModelId[]
  rph: number
  threads: number
}>

/** Hard-coded baselines. Each value is overridable per env (see `.env.example`). */
const BASE_TIERS: Record<Tier, Entitlements> = {
  anonymous: {
    tier: "anonymous",
    maxContextTokens: 16_000,
    allowedModelIds: ["gemini-flash", "deepseek-chat"],
    maxRequestsPerHour: 50,
    maxThreads: 20,
  },
  "free-signed-in": {
    tier: "free-signed-in",
    maxContextTokens: 32_000,
    allowedModelIds: MODELS.map((m) => m.id),
    maxRequestsPerHour: 100,
    maxThreads: 50,
  },
  premium: {
    tier: "premium",
    maxContextTokens: 96_000,
    allowedModelIds: MODELS.map((m) => m.id),
    maxRequestsPerHour: 1_000,
    maxThreads: 0,
  },
}

const ENV_PREFIX: Record<Tier, string> = {
  anonymous: "TIER_ANON",
  "free-signed-in": "TIER_FREE",
  premium: "TIER_PREMIUM",
}

function parseInt0(raw: string | undefined): number | null {
  if (raw == null) return null
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
}

/** Parse a comma-separated list of ModelIds; drop unknown ids silently. */
export function parseModelList(raw: string | undefined): readonly ModelId[] | null {
  if (raw == null) return null
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(asModelId)
    .filter((m): m is ModelId => m != null)
  return ids.length > 0 ? ids : null
}

/** Apply env overrides on top of a base tier. Exported for testing. */
export function applyOverrides(
  base: Entitlements,
  overrides: EntitlementOverrides,
): Entitlements {
  return {
    ...base,
    maxContextTokens: overrides.ctx ?? base.maxContextTokens,
    allowedModelIds: overrides.models ?? base.allowedModelIds,
    maxRequestsPerHour: overrides.rph ?? base.maxRequestsPerHour,
    maxThreads: overrides.threads ?? base.maxThreads,
  }
}

function readEnvOverrides(tier: Tier): EntitlementOverrides {
  const p = ENV_PREFIX[tier]
  return {
    ctx: parseInt0(process.env[`${p}_CTX`]) ?? undefined,
    models: parseModelList(process.env[`${p}_MODELS`]) ?? undefined,
    rph: parseInt0(process.env[`${p}_RPH`]) ?? undefined,
    threads: parseInt0(process.env[`${p}_THREADS`]) ?? undefined,
  }
}

/** Resolve a tier's full entitlements, with env overrides applied. */
export function getTierEntitlements(tier: Tier): Entitlements {
  return applyOverrides(BASE_TIERS[tier], readEnvOverrides(tier))
}

/**
 * Resolve the entitlements for the caller. Today this is always the anonymous
 * tier — M4 will swap the body to read an auth session from the request.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getEntitlements(req: Request): Entitlements {
  return getTierEntitlements("anonymous")
}

export function clampModelForTier(
  requested: ModelId,
  ent: Entitlements,
): ModelId {
  const pickFirstAllowedAvailable = (): ModelId => {
    for (const id of ent.allowedModelIds) {
      if (getModelMeta(id).status === "available") return id
    }
    for (const m of MODELS) {
      if (m.status === "available") return m.id
    }
    return MODELS[0].id
  }

  if (!ent.allowedModelIds.includes(requested)) {
    return pickFirstAllowedAvailable()
  }
  if (getModelMeta(requested).status === "available") {
    return requested
  }
  return pickFirstAllowedAvailable()
}
