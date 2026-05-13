# ADR 0001 — Mock-data-only web shell (no persistence)

- **Status**: Accepted
- **Date**: 2026-05-13
- **Supersedes**: —
- **Superseded by**: — (revisit when a native app shell or logged-in user exists; see M2 in [../ROADMAP.md](../ROADMAP.md))

## Context

`ali-chat` is currently a UI shell. All thread state lives in memory and is seeded from [`lib/mock-threads.ts`](../../lib/mock-threads.ts) via [`hooks/use-thread-workspace.ts`](../../hooks/use-thread-workspace.ts). Pins, archive flags, draft text, model selection and `mainView` reset on every reload. The Library PRD [.scratch/chat-history-views/PRD.md](../../.scratch/chat-history-views/PRD.md) explicitly records this as a deliberate choice ("Defer local persistence until native app and/or logged-in user").

We need an ADR to make that decision durable and reviewable.

## Decision

Do not add client persistence (localStorage, IndexedDB, cookies, etc.) for the web shell at this stage.

- Treat in-memory seed data as the canonical source for the shell.
- Keep the `Thread` model in [`lib/chat-types.ts`](../../lib/chat-types.ts) persistence-agnostic so a store can be slotted in later without reshaping the UI.
- Workspace-level state mutations stay funneled through `useThreadWorkspace` so a future persistence layer has a single seam to attach to.

## Consequences

**Positive**
- Faster iteration on UI, grouping heuristics, and DnD without migration code paths.
- No SSR hydration mismatches from reading client-only stores.
- Clean baseline for the persistence work in M2 — one place to wire it in.

**Negative**
- Reloads wipe state; demos and bug repros must be re-seeded.
- Cannot dogfood multi-session workflows yet.

## Trigger to revisit

Open M2 in the roadmap and write a successor ADR when **either** of these becomes true:

1. A native app shell (Tauri / Capacitor / RN-Web) lands and needs a real store.
2. An authenticated user concept is introduced (M4 — auth + multi-device).

The successor ADR should pick the store (localStorage JSON vs IndexedDB), define the persisted shape, and specify the migration shim.

## Alternatives considered

- **localStorage now**: Cheap, but commits us to a shape before persistence requirements (sync, conflict resolution) are understood; would need migrating anyway in M4.
- **IndexedDB now**: Higher upfront cost, same migration risk; premature for a shell still iterating on the data model.
- **Cookie / URL only**: Already partially in place via `?thread=<id>` deep links; sufficient for deep-linking but not a persistence story.
