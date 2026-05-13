# 01 — Pinned-folder regroup rules

Status: needs-triage
Parent PRD: [../PRD.md](../PRD.md)

## Summary

Define what happens to threads inside a **pinned folder** (folder-pin / collection) when Tier-A heuristic grouping reshuffles their membership. Today the user can pin a whole Library folder so it appears as a Favourite, but grouping is recomputed every render from titles via `groupThreadsHeuristic` in [lib/group-threads.ts](../../../lib/group-threads.ts). The threads inside a pinned folder are therefore an unstable set.

The same question reappears once Tier-B server grouping lands (see M5 in [docs/ROADMAP.md](../../../docs/ROADMAP.md)) — the rule chosen here should generalise.

## Why now

Blocks the "pin a whole folder" branch of Favourites (PRD §Decisions — "Favourites population: Both"). Without a rule, pinned-folder UI can silently drop or duplicate threads after a rename or new chat.

## Proposed options

1. **Snapshot at pin time** — capture the thread ids at the moment of pin; future regroups never change membership. New matches do not auto-join.
2. **Live re-bind** — pinned folder always reflects the current heuristic cluster for its `folderKey`. Threads that leave the cluster disappear from the favourite.
3. **Hybrid** — snapshot ids on pin, but show a small "N new matches" affordance when the live cluster diverges, with a one-click "absorb" action.

## Acceptance criteria

- Choice recorded in PRD `## Decisions` and as a short ADR in [docs/adr/](../../../docs/adr/).
- Pure helper in [lib/thread-workspace-logic.ts](../../../lib/thread-workspace-logic.ts) (or sibling) computes the displayed thread set from `(pinnedFolder, currentGroups)`.
- Unit tests cover: rename causing a thread to leave the cluster, new thread joining the cluster, thread deletion.
- UI in [components/chat/library/library-apps-view.tsx](../../../components/chat/library/library-apps-view.tsx) (or favourites strip when it exists) handles the chosen behaviour without empty/ghost rows.

## Out of scope

- Implementing the Favourites surface itself (tracked as a separate M5 item).
- Tier-B server-grouping rules — revisited in M5; this issue must not lock us out of either.

## Comments
