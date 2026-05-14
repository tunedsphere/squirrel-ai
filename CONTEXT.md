# Domain context — ali-chat

Short glossary for product terms and UI seams. Code layout: design primitives in `components/ui/`, chat UI in `components/chat/` (shell panes under `components/chat/shell/`), behavior in `hooks/` and `lib/`.

## Terms

**Thread** — One conversation: `id`, `title`, `messages[]`, optional folder metadata for future grouping tiers. In-memory seed data today (`lib/mock-threads.ts`); persistence is a separate decision.

**Main view** — Which primary panel fills the main column: `chat` (messages + composer) or `library` (threads grouped heuristically). Toggled from the inset header; state lives in the thread workspace hook.

**Library** — Main-column view that lists **thread folders** (Tier A heuristic grouping from titles via `lib/group-threads.ts`). Selecting a row opens that thread in **Chat** and updates navigation.

**Pin strip** — Compact square tabs in the sidebar for quick thread switching; drag a history row onto a slot to pin (see `MAX_PINS` in `lib/chat-constants.ts`). Reorder via drag on tabs.

**Composer** — Bottom message field: textarea, model picker (mock labels), send. Wired by `components/chat/shell/chat-composer.tsx`; draft and send pipeline live in `hooks/use-thread-workspace.ts`.

**Thread workspace** — The hook + pure helpers that own thread list mutations, archive, pins, URL sync, and mock assistant resolution (`hooks/use-thread-workspace.ts`, `lib/thread-workspace-logic.ts`).

## URL

**`?thread=<threadId>`** — When present and the id matches a non-archived thread, the app opens **Chat** on that thread and keeps the query in sync when switching threads (`router.replace`, scroll disabled). Archived or unknown ids are ignored for deep-link activation.

## Drag-and-drop MIME

**`THREAD_DRAG_MIME`** (`lib/chat-constants.ts`) — Custom `dataTransfer` type for dragging a thread id onto the pin strip or related targets.

**`EXPORT_CLIP_DRAG_MIME`** (`lib/conversation-export-clip.ts`) — Structured JSON payload for dragging or pasting an **export clip** into the conversation export / PDF flow; includes `excerpt` plus optional `role` (speaker label for staged markdown).

**`EXPORT_PENDING_CLIP_DRAG_MIME`** (`lib/conversation-export-clip.ts`) — During drag-from-buffer, `{ id }` references a row in that thread's **pending clips buffer** (`EXPORT_CLIP_DRAG_MIME` is also set alongside for preview text).

**Export clip** — User-selected text from a chat message, delivered as `text/plain` plus the structured MIME above, then merged into **staging markdown** for PDF preview (slides delimited by `##` headings; clips become `## Clip (…)` sections).

**Staging markdown** — Working export document for PDF/PPTX: optional `#` deck title and preamble lines, then one or more **`##`-delimited slides`. **Export clips** merge in as new `##` sections. Placement between slides targets a **gap** (see preview stack overlay), not an arbitrary mid-paragraph cursor.

**Clip staging** — The PDF export flow where you iteratively add **export clips** into existing **staging markdown** (gaps + dock + slide reorder), without editing the full markdown source in a separate editor. Distinct from a hypothetical full **staging editor** that would edit arbitrary body lines inside a slide.

**Pending clips buffer** — Per-thread queue in the export workspace: drops on the **PDF export dock** (and orb paste while PDF export targets that thread) **enqueue** clips here before they become `##` slides. From the buffer, drag onto preview **gaps**, use **Add to end** (last gap), or discard. Direct drops from chat onto preview gaps still merge immediately (no buffer hop).

**Gap** — A logical insertion point **between** `##` slides (including before the first and after the last). Shown as **drop bands** on the PDF preview while dragging a clip; distinct from docking a clip on the dock orb (last gap ordering).

**Preview stack** — PDF export preview column: a **Placement slots** rail (large dashed targets) sits above an iframe rendering the staged sheet; overlays add shaded **insertion bands** only while an eligible clip drag is in motion so the iframe stays usable between drags.

**PDF export dock** — Right-rail control for export. **PDF orb** drop/paste with no prior **staging markdown** for that thread opens PDF export using a minimal deck shell (`#` title + `---`) and enqueues the clip in the **pending clips buffer**. With staging already present or the PDF dialog open for that thread, drop/paste only enqueues. To place clips onto the deck: drag chips from **Pending clips** onto preview gaps, or **Add to end**. **Clip** drags originating in chat messages can still drop straight onto gaps (immediate merge). Slide **reordering** remains the slide-order rail under the preview.
