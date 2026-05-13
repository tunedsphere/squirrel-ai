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

export type ChatMessageColumnProps = {
  activeThread: Thread | undefined;
  isEmptyChat: boolean;
  onPickPrompt: (text: string) => void;
  onRetryMessage?: (threadId: string, messageId: string) => void;
  /** When this increments after the user sends (or retries), scroll once—not on streaming tokens. */
  scrollEpoch: number;
};

export function ChatMessageColumn({
  activeThread,
  isEmptyChat,
  onPickPrompt,
  onRetryMessage,
  scrollEpoch,
}: ChatMessageColumnProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  /** Thread switch: one jump to the end when opening a thread that has messages (token updates do not retrigger). */
  React.useLayoutEffect(() => {
    const id = activeThread?.id;
    if (!id) return;
    const hasMessages = (activeThread?.messages?.length ?? 0) > 0;
    if (!hasMessages) return;
    scrollColumnToBottom(scrollRef.current);
    /* Only when `activeThread.id` changes. Do not list `messages`—token updates must not scroll. */
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scroll only on thread switch
  }, [activeThread?.id]);

  /** User send / retry: one scroll after the new user + pending row is committed. */
  React.useLayoutEffect(() => {
    if (scrollEpoch === 0) return;
    scrollColumnToBottom(scrollRef.current);
  }, [scrollEpoch]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto scroll-smooth",
          isEmptyChat && "flex flex-col",
        )}
      >
        <div
          key={activeThread?.id ?? "no-thread"}
          className={cn(
            "mx-auto flex w-full max-w-3xl flex-col px-4 py-4 pb-44 sm:px-6 sm:py-5 sm:pb-48",
            isEmptyChat ? "min-h-0 flex-1 justify-center" : "gap-6 sm:gap-7",
            MAIN_PANE_ENTER_CHAT,
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
