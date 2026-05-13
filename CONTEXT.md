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
