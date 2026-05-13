"use client"

import { HistoryLibraryView } from "@/components/chat/history-library-view"
import { MAIN_PANE_ENTER_LIBRARY } from "@/components/chat/shell/main-pane-motion"
import type { ThreadFolderGroup } from "@/lib/group-threads"
import { cn } from "@/lib/utils"

export type ChatLibraryPaneProps = {
  groups: ThreadFolderGroup[]
  pinnedIds: string[]
  onSelectThread: (threadId: string) => void
  onPinAllInGroup: (threadIds: string[]) => void
  onUnpinAllInGroup: (threadIds: string[]) => void
  onThreadDragStart?: () => void
  onThreadDragEnd?: () => void
}

export function ChatLibraryPane(props: ChatLibraryPaneProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden",
        MAIN_PANE_ENTER_LIBRARY,
      )}
    >
      <HistoryLibraryView {...props} />
    </div>
  )
}
