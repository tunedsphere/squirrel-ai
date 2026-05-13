# 02 — Touch pin affordance

Status: needs-triage
Parent PRD: [../PRD.md](../PRD.md)

## Summary

Pinning a thread today requires HTML5 drag-and-drop onto the pin strip — see `onDragStart` in [components/chat/pin-tab-strip.tsx](../../../components/chat/pin-tab-strip.tsx) and the drag plumbing in [hooks/use-thread-workspace.ts](../../../hooks/use-thread-workspace.ts). On touch devices native HTML5 DnD is unreliable. We need a touch-friendly path to pin / unpin a thread.

The context menu already exists at [components/chat/history-thread-context-menu.tsx](../../../components/chat/history-thread-context-menu.tsx) and is the obvious second seam; long-press triggers it on touch.

## Why now

Listed in PRD `## Open items`. Also blocks shipping the Library tile DnD on mobile (see issue `03`).

## Proposed options

1. **Overflow menu only** — keep DnD on desktop; on touch, rely solely on the "Pin" item already in `HistoryThreadContextMenu` (and a matching entry on Library tiles).
2. **Touch DnD via pointer events** — replace HTML5 DnD with a pointer-events library (e.g. `@dnd-kit/core`) so drag works uniformly across mouse and touch.
3. **Hybrid** — overflow menu as primary mobile affordance, plus a long-press-and-drag gesture for power users. Highest cost, most familiar UX.

## Acceptance criteria

- Decision recorded in PRD `## Decisions`.
- Pin / unpin works on iOS Safari and Android Chrome without DnD glitches.
- The chosen affordance is discoverable: visible icon button or menu entry on touch viewports.
- Keyboard pin/unpin (PRD §5) still works on desktop and is documented.
- No regression to the existing desktop drag behaviour in [components/chat/pin-tab-strip.tsx](../../../components/chat/pin-tab-strip.tsx).

## Out of scope

- Reordering pins on touch — separate sub-issue once the basic add/remove flow lands.
- Library group-pin drag — covered alongside issue `03`.

## Comments
