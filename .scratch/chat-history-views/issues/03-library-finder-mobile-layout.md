# 03 — Library Finder mobile layout & fader

Status: needs-triage
Parent PRD: [../PRD.md](../PRD.md)

## Summary

The Library view in [components/chat/library/library-apps-view.tsx](../../../components/chat/library/library-apps-view.tsx) is a Finder-style tile grid with a width fader (`CELL_MIN` / `CELL_MAX` / `CELL_DEFAULT`). On narrow viewports we need to decide:

1. **Layout**: stack the grid into a single column vs allow horizontal scroll between columns ("Finder columns").
2. **Fader mechanism**: keep `gridTemplateColumns: repeat(auto-fill, minmax(${cellPx}px, 1fr))`, switch to CSS `scale()`, or font-size driven zoom.
3. **Stacking**: the fader currently floats `absolute bottom-4 right-4` — it can overlap the chat composer when the user switches back to chat (composer is conditionally rendered in [components/chat/chat-shell.tsx](../../../components/chat/chat-shell.tsx)) and may collide with mobile system UI / safe-area insets.

## Why now

Listed in PRD `## Open items`. Mobile Library is currently usable but cramped, and the fader can sit under the iOS home indicator.

## Proposed options

### Layout
- **A: Single column stack** (default below `sm`). Simplest; loses spatial metaphor.
- **B: Horizontal scroll with snap** between Finder columns. Matches "column browser" decision in PRD §Decisions; needs scroll indicators.
- **C: A on phone, B on tablet** keyed off Tailwind breakpoints.

### Fader
- **Min-width (current)** — clean, snaps to whole columns, but only varies cell footprint, not type scale.
- **CSS `scale()`** on the grid — true zoom feel, but blurs sub-pixel text and breaks hit-test math.
- **Font-size / CSS var** driving padding + icon + label sizes — most work, best result, ties into a future density token.

### Stacking
- Hide the fader on viewports under a threshold; expose density in a settings menu instead.
- Or anchor it to the Library pane (not viewport) and inset for `env(safe-area-inset-bottom)`.

## Acceptance criteria

- One choice per axis (Layout / Fader / Stacking) recorded in PRD `## Decisions`, optionally with an ADR.
- Library renders cleanly on iPhone SE width (375 px) and iPad mini portrait.
- Fader never overlaps the composer when Library re-mounts under Chat, and respects safe-area insets.
- Tile grid keeps focus ring + drag preview behaviour from `setLibraryPinDragPreview`.

## Out of scope

- Implementing horizontal swipe between sub-views (covered by issue `04`).
- Replacing HTML5 DnD with touch DnD (covered by issue `02`).

## Comments
