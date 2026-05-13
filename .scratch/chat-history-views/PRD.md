# PRD: Chat view + Library (grouped history)

## Goal

Two primary views in the main column: **Chat** (messages + composer) and **Library** (threads grouped into folders). A **centered** view toggle lives in the top header of the main inset (see `components/chat/chat-shell.tsx`).

## Grouping

- **Tier A (v1)**: Deterministic client-side grouping from thread titles (token overlap / similarity), human-readable folder labels (e.g. shared keywords → “Recipes”).
- **Tier B (later)**: Server route batches LLM (or embeddings) categorization; persist `folderKey`, `folderTitle`, `groupingSource`, `lastGroupedAt`; invalidate when title changes. Do **not** bundle large models in the client binary—call an API for scalability and updates.

## UX

- Library: collapsible sections per folder; row opens thread → switch to Chat + set `activeThreadId`.
- Chat: unchanged behavior for messages/composer.
- Sidebar “History” stays a **flat** list (no mirrored folder tree in sidebar).
- **Compact fast tabs**: Optional compact mode shows a **row of square tabs** above History (still in the left sidebar). **Drag** a thread from History (and later from Library rows) onto a tab slot to pin; drag tabs to **reorder**; empty slot accepts drop. Quick switch by clicking a tab.

## Data model (target)

Extend `Thread` in `lib/chat-types.ts` or parallel metadata:

- Optional: `folderKey`, `folderTitle`, `groupingSource: 'heuristic' | 'server'`.
- **Fast tabs**: ordered list of `threadId` (and optional max length, e.g. 6–8); UI shows initials / favicon / truncated title in square hit targets.
- Today: in-memory only (`lib/mock-threads.ts`); persistence (localStorage / DB) is a separate decision.

## Engineering tasks

1. Types / grouping DTO aligned with Tier A + Tier B.
2. `lib/group-threads.ts` — pure functions, testable.
3. `HistoryLibraryView` + `view: 'chat' | 'library'` state in shell.
4. Header: three-zone layout; centered segmented **Chat | Library**; keep mobile `SidebarTrigger` + `ThemeToggle`.
5. Sidebar: fast-tab strip + drag-and-drop (HTML5 DnD or pointer library); keyboard alternative to pin/unpin; overflow when max tabs.
6. Phase 2: API route + persistence + debounced re-group.

## Open decisions (grilling)

Tracked in conversation; append resolutions under `## Decisions` below.

## Decisions

- **Persistence v1**: Defer local persistence until native app and/or logged-in user; keep in-memory for the web shell. (User: scalability TBD; local store when app/auth exists.)
- **Sidebar History**: Remains a **flat** list (not mirrored folder tree in sidebar).
- **Favourites (user idea)**: Section **above** flat History for favourite groups (e.g. recipes). Clicking a group shows related threads; **default layout: inset strip (B)** — narrow list **inside the main column** to the left of the transcript (not a second global sidebar). Second bar (A) reserved for a later desktop power-user mode if needed.
- **Favourites drill-down UX**: **B** recommended: fewer layers of chrome, better on narrow viewports; click thread row → open chat (`activeThreadId` + stay on Chat view).
- **Favourites population**: **Both** — (1) star/pin individual threads into collections, and (2) pin a whole Library folder so membership can track heuristic (or future server) regrouping; needs clear UX when a pinned folder’s threads move groups.
- **Fast tabs (user proposal)**: Compact mode with square tab strip **above** flat History; **drag chats** into tab slots (and reorder tabs). **Decision**: Treat **pin = tab** at the thread level — pinned threads appear as square fast-tabs (ordered list with max slots + overflow); named Favourite **groups** / folder-pins remain a separate concept for collections and Library-linked sets.
- **Library visual (grill 2026)**: **Finder-style** column browser as the spatial metaphor (folders | threads, optional third column later). **Bottom-right** floating **scale fader** (slider) to zoom tile/column density (“see more vs less” at a glance). **Enter/leave group**: subtle **in/out** transition (short duration, `prefers-reduced-motion` = none). No heavy particle/WebGL effects.
- **Library mobile (grill 2026)**: **Vertical scroll** for coarse “big category” bands (e.g. Food) with **dense rows**; **horizontal swipe** to move among related sub-views (e.g. Recipes · Dinner · Restaurants). Combines bottom-anchored category discovery with lateral drill-in. Example categories are **aspirational** for when Tier B / LLM categorization exists; v1 can simulate lightly or stay flat until model-backed hierarchy ships.

## Open items (still to grill or implement)

- Rules when a thread leaves a pinned folder after regroup (stay in collection vs drop).
- Milestone split: implement Chat + Library + heuristics first, then favourites (both modes) + inset strip.
- Touch: drag-to-tab on mobile vs overflow menu “Add to tabs”.
- **Library Finder + fader**: Mobile/tablet column layout (stack vs horizontal scroll); exact fader range (CSS `scale` vs font-size vs column min-width); z-index vs composer/header overlap.
- **Library hierarchy**: Tier A flat groups today; Tier B / model later supplies rich parent/child categories — mobile swipe UX should **degrade gracefully** to single-level until then.