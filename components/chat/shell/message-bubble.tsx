"use client"

import { AlertTriangle, LogIn, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { ChatMessage } from "@/lib/chat-types"
import { cn } from "@/lib/utils"

export type MessageBubbleProps = {
  message: ChatMessage
  onRetry?: (messageId: string) => void
}

export function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  if (message.type === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[min(85%,28rem)] rounded-lg bg-sidebar px-4 py-3.5 text-sm text-sidebar-foreground sm:px-5 sm:py-4">
          {message.content}
        </div>
      </div>
    )
  }

  if (message.type === "assistant-pending") {
    const streamed = message.content?.length ? message.content : null
    return (
      <div className="flex justify-start">
        {streamed ? (
          <div className="max-w-[min(85%,28rem)] whitespace-pre-wrap px-3 py-2.5 text-sm text-foreground">
            {streamed}
            <span
              className="ml-0.5 inline-block h-3 w-1.5 translate-y-[1px] animate-pulse bg-foreground/60 align-middle"
              aria-hidden
            />
          </div>
        ) : (
          <div
            className="max-w-[min(85%,28rem)] space-y-2 px-3 py-3"
            aria-label="Assistant is replying"
          >
            <Skeleton className="h-3 w-[min(100%,14rem)]" />
            <Skeleton className="h-3 w-[min(100%,10rem)]" />
            <Skeleton className="h-3 w-[min(100%,12rem)]" />
          </div>
        )}
      </div>
    )
  }

  if (message.type === "assistant-error") {
    const isRateLimit = message.kind === "ratelimit"
    const isStopped = message.kind === "stopped"
    const retryLabel = isStopped ? "Resume" : "Retry"
    return (
      <div className="flex justify-start">
        <div
          className={cn(
            "max-w-[min(85%,28rem)] rounded-lg border px-3 py-2.5 text-sm sm:px-4 sm:py-3",
            isRateLimit
              ? "border-amber-300/60 bg-amber-50/60 text-amber-900 dark:border-amber-400/40 dark:bg-amber-950/30 dark:text-amber-100"
              : "border-destructive/40 bg-destructive/5 text-foreground",
          )}
          role="status"
        >
          {message.content ? (
            <div className="mb-2 whitespace-pre-wrap text-foreground/90">
              {message.content}
            </div>
          ) : null}
          <div className="flex items-start gap-2">
            <AlertTriangle
              className={cn(
                "size-4 shrink-0 translate-y-0.5",
                isRateLimit ? "text-amber-700 dark:text-amber-300" : "text-destructive",
              )}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium leading-snug">{message.message}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {message.canRetry && onRetry ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 px-2.5 text-xs"
                    onClick={() => onRetry(message.id)}
                  >
                    <RotateCcw className="size-3.5" aria-hidden />
                    {retryLabel}
                  </Button>
                ) : null}
                {isRateLimit ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1.5 px-2.5 text-xs"
                    disabled
                    title="Sign-in lands in a future milestone"
                  >
                    <LogIn className="size-3.5" aria-hidden />
                    Sign in to unlock more
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[min(85%,28rem)] whitespace-pre-wrap px-3 py-2.5 text-sm text-foreground">
        {message.content}
      </div>
    </div>
  )
}
