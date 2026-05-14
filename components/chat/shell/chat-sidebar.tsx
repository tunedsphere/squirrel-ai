"use client"

import * as React from "react"
import { MessageSquare, Squirrel } from "lucide-react"

import { HistoryThreadContextMenu } from "@/components/chat/history-thread-context-menu"
import { PinTabStrip } from "@/components/chat/pin-tab-strip"
import { CollapsibleSearch } from "@/components/chat/shell/collapsible-search"
import { NewChatCta } from "@/components/chat/shell/new-chat-cta"
import { SidebarLoginButton } from "@/components/chat/shell/sidebar-login-button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { MAX_PINS, THREAD_DRAG_MIME } from "@/lib/chat-constants"
import { setPinThreadDragPreview } from "@/lib/chat-dnd"
import type { Thread } from "@/lib/chat-types"
import type { ConversationExportFormat } from "@/lib/conversation-export-settings"
import { cn } from "@/lib/utils"

export type ChatSidebarProps = {
  sidebarCollapsed: boolean
  newChat: () => void
  searchQuery: string
  setSearchQuery: (v: string) => void
  threads: Thread[]
  filteredThreads: Thread[]
  pinnedIds: string[]
  setPinnedIds: React.Dispatch<React.SetStateAction<string[]>>
  activeThreadId: string
  openChatThread: (threadId: string) => void
  threadDragActive: boolean
  onThreadPinDragStart: () => void
  onThreadPinDragEnd: () => void
  togglePinThread: (id: string) => void
  shareThread: (thread: Thread) => void | Promise<void>
  renameThread: (thread: Thread) => void
  archiveThread: (id: string) => void
  requestDeleteThread: (thread: Thread) => void
  openThreadInNewTab: (threadId: string) => void
  exportThreadMarkdown: (thread: Thread) => void
  openConversationExport: (
    thread: Thread,
    format: ConversationExportFormat,
    opts?: { stagingMarkdown?: string },
  ) => void
}

export function ChatSidebar(props: ChatSidebarProps) {
  const {
    sidebarCollapsed,
    newChat,
    searchQuery,
    setSearchQuery,
    threads,
    filteredThreads,
    pinnedIds,
    setPinnedIds,
    activeThreadId,
    openChatThread,
    threadDragActive,
    onThreadPinDragStart,
    onThreadPinDragEnd,
    togglePinThread,
    shareThread,
    renameThread,
    archiveThread,
    requestDeleteThread,
    openThreadInNewTab,
    exportThreadMarkdown,
    openConversationExport,
  } = props

  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader className="border-b border-sidebar-border p-0">
        <div
          className={cn(
            "grid min-h-10 grid-cols-[1fr_auto_1fr] items-center px-3 py-2",
            "group-data-[collapsible=icon]:grid-cols-1 group-data-[collapsible=icon]:justify-items-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-2",
          )}
        >
          <div className="justify-self-start group-data-[collapsible=icon]:justify-self-auto">
            <SidebarTrigger className="group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:min-h-8 group-data-[collapsible=icon]:min-w-8 group-data-[collapsible=icon]:shrink-0" />
          </div>
          <span
            className={cn(
              "max-w-[12rem] truncate px-1 text-center font-semibold tracking-tight sm:max-w-[14rem]",
              "group-data-[collapsible=icon]:hidden",
            )}
          >
            Squirrel Chat
          </span>
          <div className="justify-self-end group-data-[collapsible=icon]:hidden">
            <Squirrel
              className="size-4 shrink-0 text-primary"
              aria-hidden
            />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex min-h-0 flex-1 flex-col gap-3 px-3 py-2 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-2 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-2">
        <SidebarGroup className="w-full shrink-0 flex-col p-0 group-data-[collapsible=icon]:items-center">
          <SidebarGroupContent className="w-full p-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
            <NewChatCta onClick={newChat} />
          </SidebarGroupContent>
        </SidebarGroup>

        <CollapsibleSearch value={searchQuery} onChange={setSearchQuery} />

        <SidebarSeparator className="mx-0 w-full !bg-transparent border-0 shadow-none group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:self-center" />

        <SidebarGroup className="w-full shrink-0 gap-1 p-0 group-data-[collapsible=icon]:hidden">
          <SidebarGroupContent className="w-full p-0">
            <PinTabStrip
              threads={threads}
              pinnedIds={pinnedIds}
              activeThreadId={activeThreadId}
              onPinnedChange={setPinnedIds}
              onOpenThread={openChatThread}
              threadDragActive={threadDragActive}
            />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="mx-0 w-full bg-sidebar-border group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:self-center" />

        <SidebarGroup className="min-h-0 w-full flex-1 gap-1 p-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
          <SidebarGroupLabel className="h-7 px-0 py-0">History</SidebarGroupLabel>
          <SidebarGroupContent className="min-h-0 w-full overflow-y-auto p-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
            <SidebarMenu className="w-full gap-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1">
              {filteredThreads.map((t) => (
                <SidebarMenuItem
                  key={t.id}
                  className="w-full group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center"
                >
                  <HistoryThreadContextMenu
                    isPinned={pinnedIds.includes(t.id)}
                    pinDisabled={
                      !pinnedIds.includes(t.id) && pinnedIds.length >= MAX_PINS
                    }
                    onTogglePin={() => togglePinThread(t.id)}
                    onShare={() => void shareThread(t)}
                    onOpenNewTab={() => openThreadInNewTab(t.id)}
                    onRename={() => renameThread(t)}
                    onExportMarkdown={() => exportThreadMarkdown(t)}
                    onExportPdf={() => openConversationExport(t, "pdf")}
                    onExportPowerpoint={() => openConversationExport(t, "pptx")}
                    onArchive={() => archiveThread(t.id)}
                    onDeletePermanently={() => requestDeleteThread(t)}
                  >
                    <SidebarMenuButton
                      type="button"
                      isActive={t.id === activeThreadId}
                      draggable={!sidebarCollapsed}
                      onDragStart={(e) => {
                        onThreadPinDragStart()
                        setPinThreadDragPreview(e, t.title)
                        e.dataTransfer.setData(THREAD_DRAG_MIME, t.id)
                        e.dataTransfer.effectAllowed = "copyMove"
                      }}
                      onDragEnd={onThreadPinDragEnd}
                      onClick={() => openChatThread(t.id)}
                      tooltip={t.title}
                    >
                      <MessageSquare className="shrink-0 opacity-70" />
                      <span className="truncate">{t.title}</span>
                    </SidebarMenuButton>
                  </HistoryThreadContextMenu>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="mt-auto shrink-0 border-t border-sidebar-border p-0">
        <div className="flex w-full px-3 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-2">
          <SidebarLoginButton />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
