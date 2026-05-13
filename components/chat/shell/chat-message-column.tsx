"use client"

import * as React from "react"

import { EmptyChatStarters } from "@/components/chat/empty-chat-starters"
import { MessageBubble } from "@/components/chat/shell/message-bubble"
import { MAIN_PANE_ENTER_CHAT } from "@/components/chat/shell/main-pane-motion"
import type { Thread } from "@/lib/chat-types"
import { cn } from "@/lib/utils"

export type ChatMessageColumnProps = {
  activeThread: Thread | undefined
  isEmptyChat: boolean
  onPickPrompt: (text: string) => void
  onRetryMessage?: (threadId: string, messageId: string) => void
}

export function ChatMessageColumn({
  activeThread,
  isEmptyChat,
  onPickPrompt,
  onRetryMessage,
}: ChatMessageColumnProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useLayoutEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [activeThread?.messages])

  return (
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
          "mx-auto flex w-full max-w-2xl flex-col px-4 py-4 pb-40 sm:px-6 sm:py-5 sm:pb-44",
          isEmptyChat ? "min-h-0 flex-1 justify-center" : "gap-3",
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
  )
}
