"use client";

import * as React from "react";

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

export function ChatShell() {
  return (
    <SidebarProvider defaultOpen>
      <React.Suspense fallback={null}>
        <ChatShellBody />
      </React.Suspense>
    </SidebarProvider>
  );
}

function ChatShellBody() {
  const { state, isMobile } = useSidebar();
  const sidebarCollapsed = !isMobile && state === "collapsed";

  const composerTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const workspace = useThreadWorkspace({ composerTextareaRef });

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

        <div className="flex min-h-0 flex-1 flex-col">
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
            <ChatMessageColumn
              activeThread={activeThread}
              isEmptyChat={isEmptyChat}
              onPickPrompt={startNewChatWithFirstMessage}
              onRetryMessage={retryFromError}
            />
          )}

          {mainView === "chat" ? (
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
            />
          ) : null}
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
