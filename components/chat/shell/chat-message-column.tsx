"use client";

import * as React from "react";

import { EmptyChatStarters } from "@/components/chat/empty-chat-starters";
import { MessageBubble } from "@/components/chat/shell/message-bubble";
import { MAIN_PANE_ENTER_CHAT } from "@/components/chat/shell/main-pane-motion";
import type { Thread } from "@/lib/chat-types";
import { cn } from "@/lib/utils";

function scrollColumnToBottom(el: HTMLElement | null) {
  if (!el) return;
  el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
}

/** Lives on ChatShell so it survives chat subtree remounts (notes split toggle). */
export type ChatMessageScrollCoordinator = {
  lastThreadId?: string;
  lastAppliedScrollEpoch: number;
};

export type ChatMessageColumnProps = {
  activeThread: Thread | undefined;
  isEmptyChat: boolean;
  onPickPrompt: (text: string) => void;
  onRetryMessage?: (threadId: string, messageId: string) => void;
  /** When this increments after the user sends (or retries), scroll once—not on streaming tokens. */
  scrollEpoch: number;
  exportClipDragEnabled?: boolean;
  /**
   * Optional ref to the scrollable message list element (used by ChatShell to preserve scroll when the
   * chat subtree is reparented, e.g. thread notes split toggle).
   */
  messageScrollContainerRef?: React.Ref<HTMLDivElement | null>;
  /** When set, thread / scrollEpoch layout scrolling skips duplicate runs after remount-only updates. */
  scrollCoordinatorRef?: React.RefObject<ChatMessageScrollCoordinator | null>;
};

export function ChatMessageColumn({
  activeThread,
  isEmptyChat,
  onPickPrompt,
  onRetryMessage,
  scrollEpoch,
  exportClipDragEnabled = false,
  messageScrollContainerRef,
  scrollCoordinatorRef,
}: ChatMessageColumnProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const setScrollContainerNode = React.useCallback(
    (node: HTMLDivElement | null) => {
      scrollRef.current = node;
      const ext = messageScrollContainerRef;
      if (!ext) return;
      if (typeof ext === "function") ext(node);
      else ext.current = node;
    },
    [messageScrollContainerRef],
  );

  /** Empty on server and while hydrating so SSR HTML matches first client paint; then apply enter motion. */
  const enterChatMotion = React.useSyncExternalStore(
    () => () => {},
    () => MAIN_PANE_ENTER_CHAT,
    () => "",
  );

  /** Thread switch: one jump to the end when opening a thread that has messages (token updates do not retrigger). */
  React.useLayoutEffect(() => {
    const id = activeThread?.id;
    const coord = scrollCoordinatorRef?.current;

    if (coord) {
      const prevThreadId = coord.lastThreadId;
      coord.lastThreadId = id;

      if (!id) return;
      const hasMessages = (activeThread?.messages?.length ?? 0) > 0;
      if (!hasMessages) return;
      if (prevThreadId !== id) {
        scrollColumnToBottom(scrollRef.current);
      }
      return;
    }

    if (!id) return;
    const hasMessages = (activeThread?.messages?.length ?? 0) > 0;
    if (!hasMessages) return;
    scrollColumnToBottom(scrollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scroll only on thread switch; omit messages so streaming doesn't scroll
  }, [activeThread?.id]);

  /** User send / retry: one scroll after the new user + pending row is committed. */
  React.useLayoutEffect(() => {
    if (scrollEpoch === 0) return;
    const coord = scrollCoordinatorRef?.current;
    if (coord) {
      if (coord.lastAppliedScrollEpoch === scrollEpoch) return;
      coord.lastAppliedScrollEpoch = scrollEpoch;
    }
    scrollColumnToBottom(scrollRef.current);
  }, [scrollEpoch]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={setScrollContainerNode}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto scroll-smooth [overflow-anchor:none]"
      >
        <div
          key={activeThread?.id ?? "no-thread"}
          className={cn(
            "mx-auto flex w-full max-w-3xl flex-col px-4 py-4 pb-44 sm:px-6 sm:py-5 sm:pb-48",
            isEmptyChat ? "min-h-0 flex-1 justify-center" : "gap-6 sm:gap-7",
            enterChatMotion,
          )}
        >
          {!activeThread ? (
            <p className="px-1 text-center text-sm text-muted-foreground">
              Select a thread or start a new chat.
            </p>
          ) : isEmptyChat ? (
            <EmptyChatStarters onPickPrompt={onPickPrompt} />
          ) : (
            activeThread.messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                exportClipDragEnabled={exportClipDragEnabled}
                onRetry={
                  onRetryMessage
                    ? (messageId) => onRetryMessage(activeThread.id, messageId)
                    : undefined
                }
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
