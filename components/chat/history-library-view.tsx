"use client"

import { LibraryAppsView } from "@/components/chat/library/library-apps-view"
import { cn } from "@/lib/utils"
import type { ThreadFolderGroup } from "@/lib/group-threads"

type HistoryLibraryViewProps = {
  groups: ThreadFolderGroup[]
  pinnedIds: string[]
  onSelectThread: (threadId: string) => void
  onPinAllInGroup: (threadIds: string[]) => void
  onUnpinAllInGroup: (threadIds: string[]) => void
  onThreadDragStart?: () => void
  onThreadDragEnd?: () => void
  className?: string
}

export function HistoryLibraryView({
  groups,
  pinnedIds,
  onSelectThread,
  onPinAllInGroup,
  onUnpinAllInGroup,
  onThreadDragStart,
  onThreadDragEnd,
  className,
}: HistoryLibraryViewProps) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <LibraryAppsView
        className="min-h-0 flex-1"
        groups={groups}
        pinnedIds={pinnedIds}
        onSelectThread={onSelectThread}
        onPinAllInGroup={onPinAllInGroup}
        onUnpinAllInGroup={onUnpinAllInGroup}
        onThreadDragStart={onThreadDragStart}
        onThreadDragEnd={onThreadDragEnd}
      />
    </div>
  )
}
