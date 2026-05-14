"use client";

import * as React from "react";

import {
  consumeExportPdfGapDrop,
  dataTransferAllowsPdfGapPlacement,
  type ExportClipPayload,
} from "@/lib/conversation-export-clip";
import { cn } from "@/lib/utils";

function gapShortLabel(gapIndex: number, gapCount: number): string {
  if (gapCount <= 1) return "Add to deck";
  if (gapIndex === 0) return "Before 1st slide";
  if (gapIndex === gapCount - 1) return "After last slide";
  return `Before slide ${gapIndex + 1}`;
}

export type ExportPdfGapDropRailProps = {
  gapCount: number;
  placementDragHot: boolean;
  /** When there are queued clips — keep the rail visibly “armed” copy-wise. */
  pendingQueueTip: boolean;
  onGapClip: (gapIndex: number, payload: ExportClipPayload) => void;
  onGapPendingClip?: (gapIndex: number, pendingId: string) => void;
};

/**
 * Large drop targets above the iframe — dependable hit areas for placement drags.
 */
export function ExportPdfGapDropRail({
  gapCount,
  placementDragHot,
  pendingQueueTip,
  onGapClip,
  onGapPendingClip,
}: ExportPdfGapDropRailProps) {
  const [hoverGap, setHoverGap] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!placementDragHot) setHoverGap(null);
  }, [placementDragHot]);

  if (gapCount < 1) return null;

  const explain =
    placementDragHot
      ? "Release on a highlighted slot"
      : pendingQueueTip
        ? "Drag a pending clip from above onto any slot"
        : "Slots accept clips while you drag from chat or pending";

  return (
    <div
      className="border-border/75 bg-muted/35 shrink-0 border-b px-2 py-2 dark:bg-muted/24"
      aria-label="PDF export placement slots"
    >
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-0.5">
        <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
          Placement slots
        </p>
        <p
          className={cn(
            "text-[10px] font-medium tracking-tight sm:text-[11px]",
            placementDragHot ? "text-primary" : "text-muted-foreground",
          )}
        >
          {explain}
        </p>
      </div>
      <div className="custom-scrollbar flex max-h-[10rem] flex-wrap gap-2 overflow-y-auto pb-0.5">
        {Array.from({ length: gapCount }, (_, i) => {
          const activeDrop = placementDragHot && hoverGap === i;
          return (
            <div
              key={i}
              className={cn(
                "flex min-h-[3.25rem] min-w-[min(100%,8rem)] max-w-full flex-1 basis-[9rem] flex-col justify-center rounded-xl border border-dashed px-2 py-2 transition-[background-color,border-color,box-shadow]",
                placementDragHot
                  ? activeDrop
                    ? "border-primary bg-primary/[0.14] shadow-[inset_0_0_0_1px] shadow-primary/20"
                    : "border-primary/40 bg-primary/[0.055] hover:border-primary/60 hover:bg-primary/[0.085]"
                  : "border-border/65 bg-background/72 hover:border-muted-foreground/35",
              )}
              onDragEnter={(e) => {
                if (!dataTransferAllowsPdfGapPlacement(e.dataTransfer)) return;
                e.preventDefault();
                e.stopPropagation();
                setHoverGap(i);
              }}
              onDragOver={(e) => {
                if (!dataTransferAllowsPdfGapPlacement(e.dataTransfer)) return;
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = "copy";
                setHoverGap(i);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setHoverGap((h) => (h === i ? null : h));
                }
              }}
              onDrop={(e) => {
                if (!dataTransferAllowsPdfGapPlacement(e.dataTransfer)) return;
                e.preventDefault();
                e.stopPropagation();
                setHoverGap(null);
                consumeExportPdfGapDrop(e.dataTransfer, i, {
                  onGapPendingClip,
                  onGapClip,
                });
              }}
            >
              <span className="text-foreground text-[11px] font-semibold leading-tight">
                {gapShortLabel(i, gapCount)}
              </span>
              {placementDragHot ? (
                <span className="text-primary mt-1 text-[10px] font-medium">Release to insert</span>
              ) : (
                <span className="text-muted-foreground mt-1 text-[10px]">Drop target</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
