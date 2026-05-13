import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

import type { Entitlements } from "@/lib/entitlements"

type RateLimitResult = {
  success: boolean
  remaining: number
  /** Unix ms when the bucket resets, or `null` when unknown / fail-open. */
  reset: number | null
}

const PASS_THROUGH: RateLimitResult = {
  success: true,
  remaining: Number.POSITIVE_INFINITY,
  reset: null,
}

const redis = (() => {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
})()

/** Memoised per-RPH limiter so we don't allocate one per request. */
const limiterByRph = new Map<number, Ratelimit>()

function limiterFor(rph: number): Ratelimit | null {
  if (!redis) return null
  const cached = limiterByRph.get(rph)
  if (cached) return cached
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(rph, "1 h"),
    prefix: "ali-chat:ratelimit",
    analytics: true,
  })
  limiterByRph.set(rph, limiter)
  return limiter
}

/** Best-effort caller identifier (IP today; will become userId in M4). */
export function callerKey(req: Request, ent: Entitlements): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  return `${ent.tier}:${ip}`
}

/**
 * Check the per-caller rate limit. Fails **open** when the store is
 * misconfigured or errors — the chat works without limits rather than
 * blocking everyone over an infra hiccup.
 */
export async function checkRateLimit(
  req: Request,
  ent: Entitlements,
): Promise<RateLimitResult> {
  if (ent.maxRequestsPerHour <= 0) return PASS_THROUGH
  const limiter = limiterFor(ent.maxRequestsPerHour)
  if (!limiter) return PASS_THROUGH
  try {
    const key = callerKey(req, ent)
    const r = await limiter.limit(key)
    return { success: r.success, remaining: r.remaining, reset: r.reset }
  } catch {
    return PASS_THROUGH
  }
}
