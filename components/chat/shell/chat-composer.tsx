"use client"

import * as React from "react"
import { Send, Square } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { ModelId } from "@/lib/mock-threads"
import { MODELS } from "@/lib/mock-threads"
import { cn } from "@/lib/utils"

export type ChatComposerProps = {
  composerTextareaRef: React.RefObject<HTMLTextAreaElement | null>
  draft: string
  setDraft: (v: string) => void
  modelId: ModelId
  setModelId: (id: ModelId) => void
  onComposerKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  handleSend: () => void
  canSendMessage: boolean
  sendButtonTooltip: string
  streamInFlight: boolean
  stopStream: () => void
}

export function ChatComposer({
  composerTextareaRef,
  draft,
  setDraft,
  modelId,
  setModelId,
  onComposerKeyDown,
  handleSend,
  canSendMessage,
  sendButtonTooltip,
  streamInFlight,
  stopStream,
}: ChatComposerProps) {
  const buttonLabel = streamInFlight ? "Stop reply" : sendButtonTooltip
  const onPrimaryAction = streamInFlight ? stopStream : handleSend
  const buttonDisabled = streamInFlight ? false : !canSendMessage
  return (
    <div className="relative z-10 shrink-0 bg-transparent px-4 pb-4 pt-3 sm:px-6 sm:pb-5 sm:pt-4">
      <div className="mx-auto w-full max-w-3xl rounded-2xl bg-muted p-1 dark:bg-muted/72 sm:p-1.5">
        <div
          className="mx-auto w-full cursor-text rounded-xl border border-border bg-background px-3 py-2 dark:bg-background/84 sm:px-4 sm:py-3"
          onPointerDown={(e) => {
            const el = e.target as HTMLElement
            if (
              el.closest("textarea") ||
              el.closest("button") ||
              el.closest("[data-slot=select-trigger]")
            ) {
              return
            }
            composerTextareaRef.current?.focus()
          }}
        >
          <div className="flex min-h-[4.75rem] flex-col">
            <Textarea
              ref={composerTextareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onComposerKeyDown}
              placeholder="Type your message here...."
              rows={2}
              className={cn(
                "min-h-14 flex-1 resize-none border-0 bg-transparent px-0 py-1.5 text-base shadow-none sm:min-h-[3.25rem]",
                "outline-none ring-0 focus-visible:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0",
                "placeholder:text-muted-foreground md:text-sm",
                "dark:bg-transparent disabled:opacity-50",
              )}
              aria-label="Type your message here"
            />
            <div className="mt-auto flex items-end justify-between gap-3 pt-1">
              <Select
                value={modelId}
                onValueChange={(v) => setModelId(v as ModelId)}
              >
                <SelectTrigger
                  size="sm"
                  className="h-auto w-fit min-w-0 max-w-[min(100%,16rem)] border-0 bg-transparent px-1 py-1 text-left text-xs text-muted-foreground shadow-none ring-0 hover:bg-transparent hover:text-foreground focus-visible:border-transparent focus-visible:ring-0 data-[size=sm]:h-auto sm:max-w-[18rem] sm:text-sm"
                >
                  <SelectValue placeholder="Model" />
                </SelectTrigger>
                <SelectContent>
                  {MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-lg"
                      className="shrink-0 text-primary hover:bg-primary/10 hover:text-primary disabled:opacity-40"
                      onClick={onPrimaryAction}
                      disabled={buttonDisabled}
                      aria-label={buttonLabel}
                      data-streaming={streamInFlight ? "true" : undefined}
                    >
                      {streamInFlight ? (
                        <Square className="size-4 fill-current" aria-hidden />
                      ) : (
                        <Send className="size-4" aria-hidden />
                      )}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={6}>
                  {buttonLabel}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
