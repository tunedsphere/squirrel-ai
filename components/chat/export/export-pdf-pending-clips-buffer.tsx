"use client";

import * as React from "react";
import { X } from "lucide-react";

import {
  applyPendingExportClipDragToDataTransfer,
  type PendingExportClip,
} from "@/lib/conversation-export-clip";
import { setExportClipDomDragActive } from "@/lib/export-clip-drag-session";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ExportPdfPendingClipsBufferProps = {
  clips: readonly PendingExportClip[];
  onAppendToEnd: (id: string) => void;
  onDismiss: (id: string) => void;
};

function previewLine(text: string, maxChars: number): string {
  const oneLine = text.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
  if (oneLine.length <= maxChars) return oneLine || "…";
  return `${oneLine.slice(0, Math.max(0, maxChars - 1)).trim()}…`;
}

/** Queued export clips awaiting placement onto preview gaps or “add to end”. */
export function ExportPdfPendingClipsBuffer({
  clips,
  onAppendToEnd,
  onDismiss,
}: ExportPdfPendingClipsBufferProps) {
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  if (clips.length === 0) return null;

  return (
    <div
      className="border-border/80 bg-muted/25 mb-3 rounded-lg border px-3 py-2 dark:bg-muted/20"
      aria-label="Pending clips buffer"
    >
      <div className="flex flex-wrap items-start justify-between gap-2 pb-2">
        <div>
          <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
            Pending clips
          </p>
          <p className="text-muted-foreground mt-0.5 max-w-md text-[11px] leading-snug">
            Use <span className="text-foreground/80 font-medium">Placement slots</span> below or
            the shaded bands over the sheet while dragging. Alternatively{" "}
            <span className="text-foreground/80 font-medium">Add to end</span>.
          </p>
        </div>
      </div>
      <ul className="flex max-h-[7.5rem] flex-wrap gap-2 overflow-y-auto">
        {clips.map((clip) => (
          <li
            key={clip.id}
            className={cn(
              "border-border/85 bg-background/90 relative flex max-w-[min(100%,18rem)] min-w-[9rem] flex-col gap-1 rounded-lg border px-2 py-1.5 text-left shadow-sm",
              draggingId === clip.id && "opacity-55",
              !reduceMotion && "touch-manipulation",
            )}
          >
            {clip.role ? (
              <span className="text-muted-foreground text-[9px] font-semibold tracking-wide uppercase">
                {clip.role}
              </span>
            ) : null}
            <div
              draggable={!reduceMotion}
              tabIndex={0}
              aria-grabbed={draggingId === clip.id}
              onDragStartCapture={() => {
                if (!reduceMotion) setExportClipDomDragActive(true);
              }}
              onDragStart={(e) => {
                if (reduceMotion) {
                  e.preventDefault();
                  return;
                }
                setDraggingId(clip.id);
                const ok = applyPendingExportClipDragToDataTransfer(e.dataTransfer, clip);
                if (!ok) {
                  setDraggingId(null);
                  setExportClipDomDragActive(false);
                  e.preventDefault();
                  return;
                }
                setExportClipDomDragActive(true);
                if (typeof e.dataTransfer?.setDragImage === "function") {
                  e.dataTransfer.setDragImage(e.currentTarget, 16, 10);
                }
              }}
              onDragEnd={() => {
                setDraggingId(null);
                setExportClipDomDragActive(false);
              }}
              title={
                reduceMotion
                  ? undefined
                  : "Drag onto Placement slots or the highlighted preview bands"
              }
              className={cn(
                !reduceMotion && "cursor-grab",
                "text-foreground/95 line-clamp-3 text-[12px] leading-snug outline-none selection:bg-primary/25",
              )}
            >
              {previewLine(clip.excerpt, 220)}
            </div>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 shrink-0 px-2 text-[11px]"
                onClick={() => onAppendToEnd(clip.id)}
              >
                Add to end
              </Button>
              <button
                type="button"
                aria-label={`Remove pending clip`}
                title="Discard"
                onClick={() => onDismiss(clip.id)}
                className="text-muted-foreground hover:bg-destructive/12 hover:text-destructive -mr-0.5 -mb-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-3.5" strokeWidth={1.85} aria-hidden />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
