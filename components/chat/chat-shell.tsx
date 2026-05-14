"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

import { QuizSessionDialog } from "@/components/chat/quiz";
import { ConversationComposerPlusActions } from "@/components/chat/conversation-composer-plus-actions";
import { ChatComposer } from "@/components/chat/shell/chat-composer";
import { ConversationExportDialog } from "@/components/chat/conversation-export-dialog";
import { ConversationExportDock } from "@/components/chat/export/conversation-export-dock";
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
import { threadHasComposerExportableAssistantResponse } from "@/lib/composer-export-eligibility";
import type { ExportClipPayload } from "@/lib/conversation-export-clip";
import {
  insertExportClipAtGap,
  insertExportClipAtLastGap,
  reorderExportStagingSlidesByIndex,
  stagingMarkdownMinimalExportShell,
} from "@/lib/conversation-export-clip";
import { cn } from "@/lib/utils";

/** Collapse the nav sidebar (and close the mobile sheet) before opening export when the viewport is this narrow. */
const EXPORT_SIDEBAR_AUTO_COLLAPSE_MAX_WIDTH_PX = 1180;

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
  const { state, isMobile, setOpen: setSidebarOpen, setOpenMobile } =
    useSidebar();
  const sidebarCollapsed = !isMobile && state === "collapsed";

  const searchParams = useSearchParams();
  const threadQuery = searchParams.get("thread");

  const composerTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const chatInsetRef = React.useRef<HTMLElement | null>(null);
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
    openConversationExport: openConversationExportBase,
    exportDialogOpen,
    exportDialogSession,
    onExportDialogOpenChange,
    exportConversationFormat,
    activeExportThread,
    conversationExportStaging,
    patchConversationExportStaging,
    getExportStagingForThread,
    conversationExportPendingClips,
    enqueuePendingExportClipForThread,
    placePendingExportClipAtGapForThread,
    appendPendingExportClipForThread,
    dismissPendingExportClipForThread,
    exportDialogThreadId,
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
    startQuizMe,
    quizSession,
    quizSessionKey,
    closeQuizSession,
    completeQuizSession,
  } = workspace;

  const openConversationExport = React.useCallback(
    (...args: Parameters<typeof openConversationExportBase>) => {
      if (
        typeof window !== "undefined" &&
        window.innerWidth < EXPORT_SIDEBAR_AUTO_COLLAPSE_MAX_WIDTH_PX
      ) {
        setSidebarOpen(false);
        setOpenMobile(false);
      }
      openConversationExportBase(...args);
    },
    [openConversationExportBase, setSidebarOpen, setOpenMobile],
  );

  const showComposerPlusActions =
    Boolean(activeThread) &&
    threadHasComposerExportableAssistantResponse(activeThread?.messages ?? []);

  const exportClipDragEnabled = mainView === "chat" && Boolean(activeThread);

  const handlePdfDockClip = React.useCallback(
    (payload: ExportClipPayload) => {
      if (!activeThread) return;
      const excerpt = payload.excerpt.trim();
      if (!excerpt) return;

      const pdfWorkspaceActive =
        exportDialogOpen &&
        exportDialogThreadId === activeThread.id &&
        exportConversationFormat === "pdf";

      if (pdfWorkspaceActive) {
        enqueuePendingExportClipForThread(activeThread.id, {
          role: payload.role,
          excerpt: payload.excerpt,
        });
        return;
      }

      const priorStaging = getExportStagingForThread(activeThread.id);
      const hasPriorStaging =
        typeof priorStaging === "string" && priorStaging.trim() !== "";

      if (hasPriorStaging) {
        openConversationExport(activeThread, "pdf");
        enqueuePendingExportClipForThread(activeThread.id, {
          role: payload.role,
          excerpt: payload.excerpt,
        });
        return;
      }

      openConversationExport(activeThread, "pdf", {
        stagingMarkdown: stagingMarkdownMinimalExportShell(activeThread.title),
      });
      enqueuePendingExportClipForThread(activeThread.id, {
        role: payload.role,
        excerpt: payload.excerpt,
      });
    },
    [
      activeThread,
      exportDialogOpen,
      exportDialogThreadId,
      exportConversationFormat,
      enqueuePendingExportClipForThread,
      getExportStagingForThread,
      openConversationExport,
    ],
  );

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
        openConversationExport={openConversationExport}
      />

      <SidebarInset
        ref={chatInsetRef}
        className="flex max-h-svh min-h-0 flex-1 flex-col overflow-hidden"
      >
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
                exportClipDragEnabled={exportClipDragEnabled}
                onPickPrompt={startNewChatWithFirstMessage}
                onRetryMessage={retryFromError}
              />
              <div
                className={cn(
                  "pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-background from-[30%] via-background/97 via-[46%] to-transparent",
                  showComposerPlusActions
                    ? "h-[calc(18rem+3.5rem)] sm:h-[calc(22rem+3.5rem)]"
                    : "h-72 sm:h-[22rem]",
                )}
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
                composerActions={
                  showComposerPlusActions && activeThread ? (
                    <ConversationComposerPlusActions
                      onExportPdf={() =>
                        openConversationExport(activeThread, "pdf")
                      }
                      onExportPowerpoint={() =>
                        openConversationExport(activeThread, "pptx")
                      }
                      onExportMarkdown={() =>
                        exportThreadMarkdown(activeThread)
                      }
                      onQuizMe={() => startQuizMe(activeThread)}
                      quizMeDisabled={streamInFlight || quizSession != null}
                    />
                  ) : undefined
                }
              />
            </div>
          )}
        </div>
      </SidebarInset>

      <QuizSessionDialog
        key={`quiz-${quizSessionKey}`}
        open={quizSession != null}
        onOpenChange={(next) => {
          if (!next) closeQuizSession();
        }}
        threadId={quizSession?.threadId ?? ""}
        transcriptMessages={quizSession?.messages ?? []}
        modelId={modelId}
        onQuizCompleted={completeQuizSession}
      />

      <DeleteThreadDialog
        threadPendingDelete={threadPendingDelete}
        dismissDeleteDialog={dismissDeleteDialog}
        confirmDeleteThread={confirmDeleteThread}
      />

      {mainView === "chat" && activeThread ? (
        <ConversationExportDock
          onPdfClip={handlePdfDockClip}
          pdfStagingActive={
            exportDialogOpen &&
            exportDialogThreadId === activeThread.id &&
            exportConversationFormat === "pdf"
          }
          exportWorkspaceActive={
            exportDialogOpen && exportDialogThreadId === activeThread.id
          }
          onOpenPdfExport={() => openConversationExport(activeThread, "pdf")}
          onOpenPptxExport={() => openConversationExport(activeThread, "pptx")}
          onExportMarkdown={() => exportThreadMarkdown(activeThread)}
        />
      ) : null}

      <ConversationExportDialog
        key={`export-${exportDialogSession}`}
        desktopHorizontalAlignRef={chatInsetRef}
        thread={activeExportThread}
        open={exportDialogOpen}
        onOpenChange={onExportDialogOpenChange}
        format={exportConversationFormat}
        stagingMarkdown={conversationExportStaging}
        onAppendExportClip={
          activeExportThread && exportConversationFormat === "pdf"
            ? (payload, insertion) =>
                patchConversationExportStaging(activeExportThread.id, (prev) =>
                  insertion?.kind === "gap"
                    ? insertExportClipAtGap(prev, insertion.gapIndex, payload)
                    : insertExportClipAtLastGap(prev, payload),
                )
            : undefined
        }
        onReorderExportSlides={
          activeExportThread && exportConversationFormat === "pdf"
            ? (fromIdx, toIdx) =>
                patchConversationExportStaging(activeExportThread.id, (prev) =>
                  reorderExportStagingSlidesByIndex(prev, fromIdx, toIdx),
                )
            : undefined
        }
        pendingExportClips={
          activeExportThread && exportConversationFormat === "pdf"
            ? conversationExportPendingClips
            : []
        }
        onPlacePendingClipAtGap={
          activeExportThread && exportConversationFormat === "pdf"
            ? (pendingId, gapIndex) =>
                placePendingExportClipAtGapForThread(
                  activeExportThread.id,
                  pendingId,
                  gapIndex,
                )
            : undefined
        }
        onAppendPendingClip={
          activeExportThread && exportConversationFormat === "pdf"
            ? (pendingId) =>
                appendPendingExportClipForThread(
                  activeExportThread.id,
                  pendingId,
                )
            : undefined
        }
        onDismissPendingClip={
          activeExportThread && exportConversationFormat === "pdf"
            ? (pendingId) =>
                dismissPendingExportClipForThread(
                  activeExportThread.id,
                  pendingId,
                )
            : undefined
        }
      />
    </>
  );
}
