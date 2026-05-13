"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

import { ChatComposer } from "@/components/chat/shell/chat-composer";
import { ChatLibraryPane } from "@/components/chat/shell/chat-library-pane";
import { ChatMainHeader } from "@/components/chat/shell/chat-main-header";
import { ChatMessageColumn } from "@/components/chat/shell/chat-message-column";
import { ChatSidebar } from "@/components/chat/shell/chat-sidebar";
import { DeleteThreadDialog } from "@/components/chat/shell/delete-thread-dialog";
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { useThreadWorkspace } from "@/hooks/use-thread-workspace";
import { cn } from "@/lib/utils";

export function ChatShell() {
  return (
    <SidebarProvider defaultOpen>
      <React.Suspense fallback={<ChatShellSuspenseFallback />}>
        <ChatShellInner />
      </React.Suspense>
    </SidebarProvider>
  );
}

function ChatShellSuspenseFallback() {
  return (
    <div className="bg-background flex h-svh w-full items-center justify-center">
      <p className="text-muted-foreground text-sm">Loading workspace…</p>
    </div>
  );
}

function ChatShellInner() {
  const { state, isMobile } = useSidebar();
  const sidebarCollapsed = !isMobile && state === "collapsed";

  const searchParams = useSearchParams();
  const threadQuery = searchParams.get("thread");

  const composerTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const workspace = useThreadWorkspace({ composerTextareaRef, threadQuery });

  const {
    threads,
    activeThreadId,
    mainView,
    setMainView,
    pinnedIds,
    setPinnedIds,
    threadDragActive,
    onThreadPinDragStart,
    onThreadPinDragEnd,
    searchQuery,
    setSearchQuery,
    modelId,
    setModelId,
    draft,
    setDraft,
    threadPendingDelete,
    dismissDeleteDialog,
    libraryGroups,
    filteredThreads,
    activeThread,
    isEmptyChat,
    openChatThread,
    pinAllInGroup,
    unpinAllInGroup,
    shareThread,
    renameThread,
    archiveThread,
    requestDeleteThread,
    confirmDeleteThread,
    togglePinThread,
    openThreadInNewTab,
    exportThreadMarkdown,
    exportThreadPdf,
    startNewChatWithFirstMessage,
    handleSend,
    stopStream,
    streamInFlight,
    scrollEpoch,
    retryFromError,
    onComposerKeyDown,
    canSendMessage,
    sendButtonTooltip,
    newChat,
  } = workspace;

  return (
    <>
      <ChatSidebar
        sidebarCollapsed={sidebarCollapsed}
        newChat={newChat}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        threads={threads}
        filteredThreads={filteredThreads}
        pinnedIds={pinnedIds}
        setPinnedIds={setPinnedIds}
        activeThreadId={activeThreadId}
        openChatThread={openChatThread}
        threadDragActive={threadDragActive}
        onThreadPinDragStart={onThreadPinDragStart}
        onThreadPinDragEnd={onThreadPinDragEnd}
        togglePinThread={togglePinThread}
        shareThread={shareThread}
        renameThread={renameThread}
        archiveThread={archiveThread}
        requestDeleteThread={requestDeleteThread}
        openThreadInNewTab={openThreadInNewTab}
        exportThreadMarkdown={exportThreadMarkdown}
        exportThreadPdf={exportThreadPdf}
      />

      <SidebarInset className="flex max-h-svh min-h-0 flex-1 flex-col overflow-hidden">
        <ChatMainHeader mainView={mainView} setMainView={setMainView} />

        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            mainView === "chat" && "chat-content-grain",
          )}
        >
          {mainView === "library" ? (
            <ChatLibraryPane
              groups={libraryGroups}
              pinnedIds={pinnedIds}
              onSelectThread={openChatThread}
              onPinAllInGroup={pinAllInGroup}
              onUnpinAllInGroup={unpinAllInGroup}
              onThreadDragStart={onThreadPinDragStart}
              onThreadDragEnd={onThreadPinDragEnd}
            />
          ) : (
            <div className="relative flex min-h-0 flex-1 flex-col">
              <ChatMessageColumn
                activeThread={activeThread}
                isEmptyChat={isEmptyChat}
                scrollEpoch={scrollEpoch}
                onPickPrompt={startNewChatWithFirstMessage}
                onRetryMessage={retryFromError}
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-72 bg-gradient-to-t from-background from-[30%] via-background/97 via-[46%] to-transparent sm:h-[22rem]"
                aria-hidden
              />
              <ChatComposer
                composerTextareaRef={composerTextareaRef}
                draft={draft}
                setDraft={setDraft}
                modelId={modelId}
                setModelId={setModelId}
                onComposerKeyDown={onComposerKeyDown}
                handleSend={handleSend}
                canSendMessage={canSendMessage}
                sendButtonTooltip={sendButtonTooltip}
                streamInFlight={streamInFlight}
                stopStream={stopStream}
                canDictate={Boolean(activeThreadId) && !streamInFlight}
              />
            </div>
          )}
        </div>
      </SidebarInset>

      <DeleteThreadDialog
        threadPendingDelete={threadPendingDelete}
        dismissDeleteDialog={dismissDeleteDialog}
        confirmDeleteThread={confirmDeleteThread}
      />
    </>
  );
}
