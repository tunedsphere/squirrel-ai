"use client"

import * as React from "react"
import { AlertTriangle, Check, Copy, LogIn, RotateCcw } from "lucide-react"

import { AssistantMarkdown } from "@/components/chat/shell/assistant-markdown"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { ChatMessage } from "@/lib/chat-types"
import { cn } from "@/lib/utils"

const assistantBubbleSurface = cn(
  "rounded-3xl bg-muted/40 px-5 py-5 sm:px-6 sm:py-6 dark:bg-muted/18",
)

const assistantBubbleTypography = cn(
  "text-base leading-[1.7] tracking-wide text-foreground/88 dark:text-foreground/76",
)

const assistantBubbleClass = cn(
  "w-full max-w-3xl",
  assistantBubbleSurface,
  assistantBubbleTypography,
)

/** Copy control sits under the bubble, trailing right; hover/focus reveals it */
const messageCopyRowClass = cn(
  "flex w-full justify-end pt-0.5",
  "pointer-events-none opacity-0 transition-opacity duration-150 motion-reduce:transition-none",
  "group-hover/msg:pointer-events-auto group-hover/msg:opacity-100",
  "group-focus-within/msg:pointer-events-auto group-focus-within/msg:opacity-100",
)

function MessageCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false)

  const onCopy = async () => {
    const t = text.trim()
    if (!t) return
    try {
      await navigator.clipboard.writeText(t)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard can fail in locked-down contexts */
    }
  }

  const empty = !text.trim()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground"
          disabled={empty}
          onClick={onCopy}
          aria-label={copied ? "Copied to clipboard" : "Copy message"}
        >
          {copied ? (
            <Check className="size-3.5" aria-hidden />
          ) : (
            <Copy className="size-3.5" aria-hidden />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {copied ? "Copied" : "Copy message"}
      </TooltipContent>
    </Tooltip>
  )
}

function AssistantThinkingDots() {
  return (
    <div
      className={cn(
        assistantBubbleClass,
        "flex min-h-[3.25rem] items-center gap-2",
      )}
      aria-label="Assistant is thinking"
      role="status"
    >
      <span className="flex items-center gap-1.5 px-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-2 rounded-full bg-primary/55 animate-bounce [animation-duration:0.65s]"
            style={{ animationDelay: `${i * 0.14}s` }}
          />
        ))}
      </span>
    </div>
  )
}

export type MessageBubbleProps = {
  message: ChatMessage
  onRetry?: (messageId: string) => void
}

export function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  if (message.type === "user") {
    return (
      <div className="flex justify-end">
        <div className="group/msg inline-flex max-w-[min(75%,28rem)] min-w-0 flex-col items-stretch">
          <div
            className={cn(
              "rounded-2xl bg-sidebar px-3 py-2.5 text-sm text-sidebar-foreground sm:px-4 sm:py-3",
              "text-pretty leading-relaxed tracking-wide",
            )}
          >
            {message.content}
          </div>
          <div className={messageCopyRowClass}>
            <MessageCopyButton text={message.content} />
          </div>
        </div>
      </div>
    )
  }

  if (message.type === "assistant-pending") {
    const streamed = message.content?.length ? message.content : null
    return (
      <div className="flex justify-start">
        {streamed ? (
          <div className="group/msg inline-flex max-w-3xl min-w-0 flex-col items-stretch">
            <div
              className={cn(
                "relative min-w-0 max-w-3xl",
                assistantBubbleSurface,
                assistantBubbleTypography,
              )}
            >
              <AssistantMarkdown content={streamed} />
              <span
                className="ml-0.5 inline-block h-4 w-1.5 translate-y-px animate-pulse rounded-[1px] bg-primary/50 align-middle"
                aria-hidden
              />
            </div>
            <div className={messageCopyRowClass}>
              <MessageCopyButton text={streamed} />
            </div>
          </div>
        ) : (
          <AssistantThinkingDots />
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
        <div className="group/msg inline-flex max-w-3xl min-w-0 flex-col items-stretch">
          <div
            className={cn(
              "min-w-0 max-w-3xl rounded-2xl border px-4 py-4 text-base sm:px-5 sm:py-5",
              isRateLimit
                ? "border-amber-300/60 bg-amber-50/60 text-amber-900 dark:border-amber-400/40 dark:bg-amber-950/30 dark:text-amber-100"
                : "border-destructive/40 bg-destructive/5 text-foreground",
            )}
            role="status"
          >
            {message.content ? (
              <div className="text-foreground/90 mb-3 leading-relaxed">
                <AssistantMarkdown content={message.content} />
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
                <p className="font-medium leading-relaxed">{message.message}</p>
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
          <div className={messageCopyRowClass}>
            <MessageCopyButton
              text={[message.content, message.message].filter(Boolean).join("\n\n")}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="group/msg inline-flex max-w-3xl min-w-0 flex-col items-stretch">
        <div
          className={cn(
            assistantBubbleSurface,
            assistantBubbleTypography,
            "relative min-w-0 max-w-3xl",
          )}
        >
          <AssistantMarkdown content={message.content} />
        </div>
        <div className={messageCopyRowClass}>
          <MessageCopyButton text={message.content} />
        </div>
      </div>
    </div>
  )
}
