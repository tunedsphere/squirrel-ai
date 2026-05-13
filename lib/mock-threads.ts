import type { Thread } from "@/lib/chat-types"

const mk = (
  id: string,
  title: string,
  messages: Thread["messages"] = []
): Thread => ({ id, title, messages })

/** Default empty thread synced into the URL when `?thread=` is missing. */
export const LANDING_THREAD_ID = "thread-landing"

/** Seed threads for the UI shell (no persistence). */
export function initialThreads(): Thread[] {
  return [
    /** First row is the default active thread — empty so the landing matches "New chat". */
    mk(LANDING_THREAD_ID, "New chat", []),
    mk("thread-welcome", "Welcome to Squirrel Chat", [
      {
        id: "m1",
        type: "user",
        content: "What can you help me with?",
      },
      {
        id: "m2",
        type: "assistant",
        content:
          "This is a static preview. Once the model is connected, replies will stream here.",
      },
    ]),
    mk("thread-notes", "Meeting notes — design review", [
      { id: "m3", type: "user", content: "Summarize decisions from today." },
      {
        id: "m4",
        type: "assistant",
        content:
          "Sidebar layout, composer with model picker, optimistic send + skeleton.",
      },
    ]),
    mk("thread-bug", "Bug: scroll jump on mobile"),
    mk("thread-idea", "Idea: voice input shortcut"),
    mk("thread-refactor", "Refactor: extract message list"),
    mk("thread-docs", "Docs: deployment checklist"),
    mk("thread-pasta", "How to make pasta alla bolognese?", []),
    mk("thread-pesto", "How to make pesto from scratch", []),
    mk("thread-risotto", "Risotto shootout: carnaroli vs arborio texture"),
    mk("thread-cast-iron", "Cast iron rescue after acidic tomato marathons"),
    mk("thread-sourdough", "Sourdough autolyse when the kitchen is freezing"),
    mk("thread-oats", "Overnight oats with miso caramel (hear me out)"),
    mk("thread-knife", "Knife skills: julienne carrots without crying"),
    mk("thread-lisbon", "Natural wine bars in Lisbon — midnight hop map"),
    mk("thread-shinjuku", "Shinjuku late-night ramen counter etiquette"),
    mk("thread-freezer", "Two-person freezer meal-prep battle plan"),
    mk("thread-squirrel", "Squirrel-proof bird feeder engineering brainstorm"),
    mk("thread-tart", "Blind-bake tart shells that do not shrink or puff"),
    mk("thread-ferment", "Kimchi fridge vs counter: funk vs speed tradeoffs"),
    mk("thread-brunch", "Dutch baby ratio experiments for Sunday brunch"),
  ]
}

export type ModelStatus = "available" | "unavailable"

/**
 * Selectable models in the composer picker. Order is significant —
 * `MODELS[0]` is the default selected model on first load (currently
 * Gemini Flash, the cheapest and free-tier-friendly option).
 */
export const MODELS = [
  {
    id: "gemini-flash",
    label: "Gemini Flash",
    status: "available",
    description:
      "Fast Gemini flash model — low latency and a solid default for everyday chat.",
  },
  {
    id: "deepseek-chat",
    label: "DeepSeek V3",
    status: "unavailable",
    description:
      "Temporarily unavailable in this build — Gemini Flash and Kimi K2 are supported.",
  },
  {
    id: "kimi-k2",
    label: "Kimi K2",
    status: "available",
    description:
      "Moonshot Kimi K2 — strong reasoning and long-context performance.",
  },
] as const

export type ModelId = (typeof MODELS)[number]["id"]

export function getModelMeta(id: ModelId): (typeof MODELS)[number] {
  for (const m of MODELS) {
    if (m.id === id) return m
  }
  return MODELS[0]
}

/** Narrow an arbitrary string to a known ModelId, or null. */
export function asModelId(value: string): ModelId | null {
  return (MODELS as readonly { id: string }[]).some((m) => m.id === value)
    ? (value as ModelId)
    : null
}
