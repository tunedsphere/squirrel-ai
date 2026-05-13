import type { LucideIcon } from "lucide-react"
import {
  Bird,
  BookOpen,
  Bug,
  ChefHat,
  Code2,
  LayoutGrid,
  Lightbulb,
  MessageSquare,
  Plane,
  Sparkles,
  Wine,
} from "lucide-react"

import type { Thread } from "@/lib/chat-types"
import type { ThreadFolderGroup } from "@/lib/group-threads"

export type LibraryGroupVisual = {
  Icon: LucideIcon
  /** Tailwind classes to color the Lucide stroke (e.g. `text-primary`). */
  iconClassName: string
}

function corpus(g: ThreadFolderGroup): string {
  return [g.folderTitle, ...g.threads.map((t) => t.title)].join(" ").toLowerCase()
}

/** Icon + tint for a thread group (from titles). */
export function libraryGroupVisual(g: ThreadFolderGroup): LibraryGroupVisual {
  const s = corpus(g)

  if (/\b(bug|scroll jump|error|crash)\b/.test(s)) {
    return { Icon: Bug, iconClassName: "text-destructive" }
  }
  if (/\b(idea|voice input|shortcut)\b/.test(s)) {
    return { Icon: Lightbulb, iconClassName: "text-amber-600 dark:text-amber-400" }
  }
  if (/\b(meeting|design review|notes)\b/.test(s)) {
    return { Icon: MessageSquare, iconClassName: "text-sky-600 dark:text-sky-400" }
  }
  if (/\b(refactor|extract|message list)\b/.test(s)) {
    return { Icon: Code2, iconClassName: "text-violet-600 dark:text-violet-400" }
  }
  if (/\b(deploy|checklist|docs:)\b/.test(s)) {
    return { Icon: BookOpen, iconClassName: "text-emerald-600 dark:text-emerald-400" }
  }
  if (/\b(welcome|squirrel chat)\b/.test(s)) {
    return { Icon: Sparkles, iconClassName: "text-primary" }
  }
  if (/\b(squirrel|bird feeder|feeder)\b/.test(s)) {
    return { Icon: Bird, iconClassName: "text-teal-600 dark:text-teal-400" }
  }
  if (/\b(shinjuku|lisbon|walk-?ins|etiquette|hop map|midnight)\b/.test(s)) {
    return { Icon: Plane, iconClassName: "text-blue-600 dark:text-blue-400" }
  }
  if (/\b(wine|cellar|pairing|natural wine)\b/.test(s)) {
    return { Icon: Wine, iconClassName: "text-fuchsia-600 dark:text-fuchsia-400" }
  }
  if (
    /\b(pasta|pesto|risotto|bolognese|recipe|kitchen|meal|oven|ramen|kimchi|oats|sourdough|tart|brunch|cast iron|julienne|freezer|dutch|ferment|caramel|miso|tomato|skillet|knife skills|blind-?bake)\b/.test(
      s
    )
  ) {
    return { Icon: ChefHat, iconClassName: "text-orange-600 dark:text-orange-400" }
  }

  return {
    Icon: LayoutGrid,
    iconClassName: "text-muted-foreground",
  }
}

/** Same icon heuristics as the library, for a single thread (e.g. pin chips). */
export function libraryThreadPinVisual(thread: Thread): LibraryGroupVisual {
  const g: ThreadFolderGroup = {
    folderKey: `thread:${thread.id}`,
    folderTitle: thread.title,
    groupingSource: "heuristic",
    threads: [thread],
  }
  return libraryGroupVisual(g)
}

/** Short blurb under the group title (for library tiles). */
export function libraryGroupDescription(g: ThreadFolderGroup): string {
  const n = g.threads.length
  if (n === 0) return "No threads in this group."
  if (n === 1) {
    const t = g.threads[0]!.title
    return t.length <= 120 ? t : `${t.slice(0, 117)}…`
  }

  const first = g.threads[0]!.title
  const second = g.threads[1]!.title
  const head =
    first.length > 56 ? `${first.slice(0, 53)}…` : first
  const more = n - 2
  if (n === 2) {
    const tail = second.length > 48 ? `${second.slice(0, 45)}…` : second
    return `${head} · ${tail}`
  }
  const mid =
    second.length > 40 ? `${second.slice(0, 37)}…` : second
  return `${head} · ${mid}${more > 0 ? ` · +${more} more` : ""}`
}
