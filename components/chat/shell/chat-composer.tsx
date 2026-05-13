"use client";

import * as React from "react";
import { Nut, Send, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ModelId } from "@/lib/mock-threads";
import { getModelMeta, MODELS } from "@/lib/mock-threads";
import { cn } from "@/lib/utils";

function modelStatusDotClass(available: boolean) {
  return cn(
    "size-1.5 shrink-0 rounded-full",
    available ? "bg-emerald-500" : "bg-muted-foreground/45",
  );
}

export type ChatComposerProps = {
  composerTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  draft: string;
  setDraft: (v: string) => void;
  modelId: ModelId;
  setModelId: (id: ModelId) => void;
  onComposerKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleSend: () => void;
  canSendMessage: boolean;
  sendButtonTooltip: string;
  streamInFlight: boolean;
  stopStream: () => void;
};

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
  const buttonLabel = streamInFlight ? "Stop reply" : sendButtonTooltip;
  const onPrimaryAction = streamInFlight ? stopStream : handleSend;
  const buttonDisabled = streamInFlight ? false : !canSendMessage;
  const currentModel = getModelMeta(modelId);
  const [previewId, setPreviewId] = React.useState<ModelId>(modelId);
  React.useEffect(() => {
    setPreviewId(modelId);
  }, [modelId]);
  const preview = getModelMeta(previewId);
  return (
    <div className="relative z-10 shrink-0 bg-transparent px-4 pb-4 pt-3 sm:px-6 sm:pb-5 sm:pt-4">
      <div className="mx-auto w-full max-w-3xl rounded-2xl bg-muted p-1 dark:bg-muted/72 sm:p-1.5">
        <div
          className="mx-auto w-full cursor-text rounded-xl border border-border bg-background px-3 py-2 dark:bg-background/84 sm:px-4 sm:py-3"
          onPointerDown={(e) => {
            const el = e.target as HTMLElement;
            if (
              el.closest("textarea") ||
              el.closest("button") ||
              el.closest("[data-slot=select-trigger]")
            ) {
              return;
            }
            composerTextareaRef.current?.focus();
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
                onOpenChange={(open) => {
                  if (open) setPreviewId(modelId);
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="h-auto w-fit min-w-0 max-w-[min(100%,16rem)] border-0 bg-transparent px-1 py-1 text-left text-xs text-muted-foreground shadow-none ring-0 hover:bg-muted/50 hover:text-foreground focus-visible:border-transparent focus-visible:ring-0 data-[size=sm]:h-auto dark:bg-transparent dark:hover:bg-muted/50 sm:max-w-[18rem] sm:text-sm"
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Nut
                      className="size-3.5 shrink-0 rotate-45 text-muted-foreground sm:size-4"
                      aria-hidden
                    />
                    <span
                      className={modelStatusDotClass(
                        currentModel.status === "available",
                      )}
                      aria-hidden
                    />
                    <span className="sr-only">
                      {currentModel.status === "available"
                        ? "Available. "
                        : "Unavailable. "}
                    </span>
                    <SelectValue placeholder="Model">
                      {currentModel.label}
                    </SelectValue>
                  </span>
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  className="w-[var(--radix-select-trigger-width)] min-w-[12rem]"
                >
                  {MODELS.map((m) => (
                    <SelectItem
                      key={m.id}
                      value={m.id}
                      disabled={m.status === "unavailable"}
                      className="pl-2"
                      onPointerEnter={() => setPreviewId(m.id)}
                      onFocus={() => setPreviewId(m.id)}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={modelStatusDotClass(
                            m.status === "available",
                          )}
                          aria-hidden
                        />
                        <span className="sr-only">
                          {m.status === "available"
                            ? "Available. "
                            : "Unavailable. "}
                        </span>
                        <span>{m.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                  <div className="border-border border-t bg-muted/40 px-2.5 py-2 text-xs">
                    <p className="font-medium text-foreground">
                      {preview.label}
                    </p>
                    <p className="text-muted-foreground">
                      {preview.status === "available"
                        ? "Available"
                        : "Unavailable"}
                    </p>
                    <p className="mt-1 leading-snug text-muted-foreground">
                      {preview.description}
                    </p>
                  </div>
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
  );
}
