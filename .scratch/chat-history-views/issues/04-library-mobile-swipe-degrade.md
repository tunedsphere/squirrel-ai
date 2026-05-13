# 04 — Library mobile swipe degrades to single level pre-Tier-B

Status: needs-triage
Parent PRD: [../PRD.md](../PRD.md)

## Summary

PRD `## Decisions` ("Library mobile") commits to vertical scroll across coarse category bands (e.g. *Food*) with horizontal swipe between related sub-views (e.g. *Recipes* · *Dinner* · *Restaurants*). That hierarchy depends on Tier-B server categorization landing in M5 (see [docs/ROADMAP.md](../../../docs/ROADMAP.md)). Until then, `groupThreadsHeuristic` in [lib/group-threads.ts](../../../lib/group-threads.ts) only returns a **flat** list of folder groups — there are no parents.

This issue specifies the **graceful-degrade** behaviour: how the mobile Library should look and feel when only Tier-A groups exist, so we can ship today without locking the design out of the Tier-B hierarchy later.

## Why now

Listed in PRD `## Open items`. Without this, mobile swipe code either has to wait for M5 or risks being thrown away when Tier-B lands.

## Proposed options

1. **Single-level only** — render all Tier-A groups as vertical bands; disable horizontal swipe entirely until `groupingSource === 'server'` data appears.
2. **Synthetic parents** — bucket Tier-A groups into 2-3 broad pseudo-parents derived from token overlap; swipe between them. Risk: misleading taxonomy.
3. **Empty-state swipe** — show swipe affordance with a single panel "More categories coming soon", to teach the gesture early.

## Acceptance criteria

- Choice documented in PRD `## Decisions`.
- The mobile Library reads `groupingSource` (already typed in [lib/chat-types.ts](../../../lib/chat-types.ts)) to decide between the degraded and the full UX.
- A small adapter — e.g. `flatGroupsToMobileBands(groups)` — sits in [lib/group-threads.ts](../../../lib/group-threads.ts) or a sibling, with unit tests covering: zero groups, one group, many flat groups, mixed heuristic + server groups.
- No swipe gesture leaks into the desktop Library tile grid.

## Out of scope

- Tier-B grouping itself (M5).
- The mobile layout / fader question — covered by issue `03`.

## Comments
