"use client";

import * as React from "react";
import { ArrowUp, Mic, Nut, Square } from "lucide-react";

import { ComposerActionsScrollRow } from "@/components/chat/shell/composer-actions-scroll-row";
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
import { useSpeechDictation } from "@/hooks/use-speech-dictation";
import { cn } from "@/lib/utils";

function modelStatusDotClass(available: boolean) {
  return cn(
    "size-1.5 shrink-0 rounded-full",
    available ? "bg-emerald-500" : "bg-muted-foreground/45",
  );
}

const WAVE_BAR_COUNT = 11;

function VoiceWaveform({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-0.5 sm:gap-1",
        className,
      )}
      aria-hidden
    >
      {Array.from({ length: WAVE_BAR_COUNT }, (_, i) => (
        <span
          key={i}
          className="bg-foreground/22 dark:bg-foreground/30 animate-voice-waveform-bar w-[3px] shrink-0 rounded-full sm:w-1"
          style={{
            height: "1.95rem",
            animationDelay: `${i * 65}ms`,
            animationDuration: `${0.52 + (i % 4) * 0.09}s`,
          }}
        />
      ))}
    </div>
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
  canDictate: boolean;
  /** Shown in a bar directly above the composer card (e.g. export actions). */
  composerActions?: React.ReactNode;
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
  canDictate,
  composerActions,
}: ChatComposerProps) {
  const speech = useSpeechDictation({ setDraft, streamInFlight });
  const draftEmpty = draft.trim().length === 0;
  const showVoiceStrip = speech.listening && !streamInFlight;
  const canShowStartMic =
    !streamInFlight &&
    speech.supported &&
    canDictate &&
    draftEmpty &&
    !speech.listening;
  const showSend = !streamInFlight && !draftEmpty && !speech.listening;

  const buttonLabel = streamInFlight
    ? "Stop reply"
    : speech.listening
      ? "Stop recording"
      : canShowStartMic
        ? "Start voice input"
        : sendButtonTooltip;
  const onPrimaryAction = streamInFlight
    ? stopStream
    : speech.listening
      ? speech.stop
      : canShowStartMic
        ? speech.start
        : handleSend;
  const buttonDisabled = streamInFlight
    ? false
    : speech.listening
      ? false
      : canShowStartMic
        ? false
        : !canSendMessage;
  const currentModel = getModelMeta(modelId);
  const [highlightedModelId, setHighlightedModelId] =
    React.useState<ModelId>(modelId);
  const preview = getModelMeta(highlightedModelId);

  return (
    <div className="relative z-10 -mt-16 shrink-0 bg-background px-4 pb-4 pt-3 sm:-mt-20 sm:px-6 sm:pb-5 sm:pt-4">
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 -top-4 z-[1] bg-[linear-gradient(180deg,transparent_0%,color-mix(in_oklch,var(--background)_70%,transparent)_4%,color-mix(in_oklch,var(--background)_96%,transparent)_11%,var(--background)_26%,var(--background)_100%)] sm:-top-5",
          composerActions
            ? "h-[11.25rem] sm:h-[13.25rem]"
            : "h-[8.25rem] sm:h-[9.5rem]",
        )}
        aria-hidden
      />
      <div className="relative z-[2]">
        {showVoiceStrip ? (
          <div
            role="region"
            aria-label="Voice input"
            className="mx-auto mb-3 flex w-full max-w-3xl justify-center px-2"
          >
            <span className="sr-only" role="status" aria-live="polite">
              Listening. Your speech is being converted to text below.
            </span>
            <VoiceWaveform />
          </div>
        ) : null}
        {composerActions ? (
          <ComposerActionsScrollRow className="mx-auto mb-2 w-full max-w-3xl px-2 sm:mb-2.5">
            {composerActions}
          </ComposerActionsScrollRow>
        ) : null}
        <div className="mx-auto w-full max-w-3xl rounded-2xl bg-muted p-1 sm:p-1.5">
          <div
            className={cn(
              "mx-auto w-full cursor-text rounded-xl border border-border bg-background px-3 py-2 sm:px-4 sm:py-3",
              speech.listening &&
                "border-muted-foreground/20 ring-muted-foreground/15 ring-1",
            )}
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
                onChange={(e) => {
                  if (speech.listening) {
                    speech.stop();
                  }
                  setDraft(e.target.value);
                }}
                onKeyDown={onComposerKeyDown}
                placeholder={
                  speech.listening
                    ? "Listening for your voice…"
                    : "Type your message here...."
                }
                rows={2}
                autoComplete="off"
                className={cn(
                  "max-h-[240px] min-h-14 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-0 py-1.5 text-base shadow-none sm:min-h-[3.25rem]",
                  "outline-none ring-0 focus-visible:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0",
                  "placeholder:text-muted-foreground md:text-sm",
                  "dark:bg-transparent disabled:opacity-50",
                )}
                aria-label="Type your message here"
              />
              {!speech.listening &&
              draft.trim().length > 0 &&
              !streamInFlight &&
              canSendMessage ? (
                <p
                  className="text-muted-foreground mt-1.5 text-xs leading-snug"
                  id="composer-send-hint"
                >
                  Send with the arrow or Enter when you’re ready.
                </p>
              ) : null}
              <div className="mt-auto flex items-end justify-between gap-3 pt-1">
                <Select
                  value={modelId}
                  onValueChange={(v) => setModelId(v as ModelId)}
                  onOpenChange={(open) => {
                    if (open) setHighlightedModelId(modelId);
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
                        onPointerEnter={() => setHighlightedModelId(m.id)}
                        onFocus={() => setHighlightedModelId(m.id)}
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
                        className={cn(
                          "shrink-0 disabled:pointer-events-none disabled:opacity-40",
                          "hover:text-primary hover:bg-primary/[0.06] dark:hover:bg-primary/[0.09]",
                          streamInFlight && "text-primary",
                          canShowStartMic && "rounded-full",
                          speech.listening &&
                            !streamInFlight &&
                            "size-12 rounded-full border border-primary/30 bg-primary/[0.08] text-primary shadow-sm hover:border-primary/40 hover:bg-primary/[0.12] dark:bg-primary/[0.1] dark:hover:bg-primary/[0.14] [&_svg]:size-5",
                          !streamInFlight &&
                            !speech.listening &&
                            "text-primary/85",
                          !streamInFlight &&
                            !speech.listening &&
                            showSend &&
                            canSendMessage &&
                            "border-primary/25 hover:border-primary/35 dark:border-primary/30 dark:hover:border-primary/40 border",
                        )}
                        onClick={onPrimaryAction}
                        disabled={buttonDisabled}
                        aria-label={buttonLabel}
                        aria-describedby={
                          draft.trim().length > 0 &&
                          !streamInFlight &&
                          !speech.listening &&
                          canSendMessage
                            ? "composer-send-hint"
                            : undefined
                        }
                        data-streaming={streamInFlight ? "true" : undefined}
                        data-dictating={speech.listening ? "true" : undefined}
                      >
                        {streamInFlight ? (
                          <Square className="size-4 fill-current" aria-hidden />
                        ) : speech.listening ? (
                          <Square className="size-5 fill-current" aria-hidden />
                        ) : canShowStartMic ? (
                          <Mic
                            className="size-4"
                            strokeWidth={2.5}
                            aria-hidden
                          />
                        ) : (
                          <ArrowUp
                            className="size-4"
                            strokeWidth={2.5}
                            aria-hidden
                          />
                        )}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={6}>
                    {buttonLabel}
                  </TooltipContent>
                </Tooltip>
              </div>
              {speech.errorMessage ? (
                <p
                  className="text-destructive mt-2 text-xs"
                  role="status"
                  aria-live="polite"
                >
                  {speech.errorMessage}{" "}
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground underline"
                    onClick={() => speech.clearError()}
                  >
                    Dismiss
                  </button>
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
