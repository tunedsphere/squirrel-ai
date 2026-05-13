import type { GroupingSource, Thread } from "@/lib/chat-types"

export type ThreadFolderGroup = {
  folderKey: string
  folderTitle: string
  groupingSource: GroupingSource
  threads: Thread[]
}

const STOP = new Set(
  [
    "a",
    "an",
    "the",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "as",
    "by",
    "with",
    "from",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "it",
    "its",
    "this",
    "that",
    "these",
    "those",
    "i",
    "you",
    "we",
    "they",
    "how",
    "what",
    "when",
    "where",
    "why",
    "can",
    "could",
    "should",
    "would",
    "do",
    "does",
    "did",
    "my",
    "your",
    "our",
    "their",
    "like",
    "just",
    "about",
    "into",
    "over",
    "after",
    "before",
    "up",
    "out",
    "if",
    "so",
    "no",
    "not",
    "only",
    "also",
    "very",
    "make",
    "making",
    "made",
    "get",
    "got",
    "use",
    "using",
    "used",
    "help",
    "please",
    "need",
    "want",
    "me",
    "some",
    "any",
    "all",
    "each",
    "every",
    "la",
    "le",
    "de",
    "du",
    "des",
    "un",
    "une",
  ].map((w) => w.toLowerCase())
)

const DEFAULT_NEW_TITLE = "new chat"

function isDefaultNewTitle(title: string): boolean {
  return title.trim().toLowerCase() === DEFAULT_NEW_TITLE
}

function tokenize(title: string): string[] {
  const raw = title
    .toLowerCase()
    .replace(/['’]/g, "")
    .split(/[^a-z0-9]+/g)
    .filter((t) => t.length > 1 && !STOP.has(t))
  return raw
}

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a)
  const B = new Set(b)
  if (A.size === 0 && B.size === 0) return 1
  if (A.size === 0 || B.size === 0) return 0
  let inter = 0
  for (const x of A) {
    if (B.has(x)) inter++
  }
  const union = A.size + B.size - inter
  return union === 0 ? 0 : inter / union
}

const MERGE_THRESHOLD = 0.18

function findParent(parent: number[], i: number): number {
  if (parent[i] !== i) parent[i] = findParent(parent, parent[i])
  return parent[i]
}

function union(parent: number[], a: number, b: number) {
  const ra = findParent(parent, a)
  const rb = findParent(parent, b)
  if (ra !== rb) parent[rb] = ra
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "group"
}

function labelForCluster(clusterThreads: Thread[]): string {
  if (clusterThreads.length === 1) {
    const t = clusterThreads[0]
    const tokens = tokenize(t.title)
    if (tokens.length > 0) {
      return titleCase(tokens.slice(0, 3).join(" "))
    }
    return t.title.trim() || "Untitled"
  }

  const freq = new Map<string, number>()
  for (const th of clusterThreads) {
    const seen = new Set<string>()
    for (const tok of tokenize(th.title)) {
      if (seen.has(tok)) continue
      seen.add(tok)
      freq.set(tok, (freq.get(tok) ?? 0) + 1)
    }
  }

  const ranked = [...freq.entries()]
    .filter(([, c]) => c >= 2 || clusterThreads.length === 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))

  if (ranked.length === 0) {
    const first = clusterThreads[0]?.title.trim()
    return first ? titleCase(first.slice(0, 32)) : "Chats"
  }

  const top = ranked.slice(0, 2).map(([w]) => w)
  return titleCase(top.join(" · "))
}

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ")
}

/**
 * Tier A: deterministic grouping from titles (Jaccard on stopword-stripped tokens).
 * Threads titled exactly "New chat" are never merged with each other.
 */
export function groupThreadsHeuristic(threads: Thread[]): ThreadFolderGroup[] {
  const n = threads.length
  if (n === 0) return []

  const tokens = threads.map((t) => tokenize(t.title))
  const parent = Array.from({ length: n }, (_, i) => i)

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const ti = threads[i].title
      const tj = threads[j].title
      if (isDefaultNewTitle(ti) && isDefaultNewTitle(tj)) continue
      if (jaccard(tokens[i], tokens[j]) >= MERGE_THRESHOLD) {
        union(parent, i, j)
      }
    }
  }

  const buckets = new Map<number, number[]>()
  for (let i = 0; i < n; i++) {
    const r = findParent(parent, i)
    const arr = buckets.get(r) ?? []
    arr.push(i)
    buckets.set(r, arr)
  }

  const originalOrder = new Map<string, number>()
  threads.forEach((t, idx) => originalOrder.set(t.id, idx))

  const groups: ThreadFolderGroup[] = []
  for (const indices of buckets.values()) {
    const clusterThreads = indices
      .map((i) => threads[i])
      .sort(
        (a, b) =>
          (originalOrder.get(a.id) ?? 0) - (originalOrder.get(b.id) ?? 0)
      )
    const folderTitle = labelForCluster(clusterThreads)
    const folderKey = `heuristic:${slugify(folderTitle)}:${clusterThreads
      .map((t) => t.id)
      .sort()
      .join("-")
      .slice(0, 64)}`
    groups.push({
      folderKey,
      folderTitle,
      groupingSource: "heuristic",
      threads: clusterThreads,
    })
  }

  groups.sort((ga, gb) => {
    const ia = originalOrder.get(ga.threads[0]?.id ?? "") ?? 0
    const ib = originalOrder.get(gb.threads[0]?.id ?? "") ?? 0
    return ia - ib
  })

  return groups
}
