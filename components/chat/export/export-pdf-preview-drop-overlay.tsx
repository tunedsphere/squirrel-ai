"use client";

import * as React from "react";

import {
  consumeExportPdfGapDrop,
  dataTransferAllowsPdfGapPlacement,
  type ExportClipPayload,
} from "@/lib/conversation-export-clip";
import { cn } from "@/lib/utils";

export type ExportPdfPreviewDropOverlayProps = {
  gapCount: number;
  placementDragHot: boolean;
  onGapClip: (gapIndex: number, payload: ExportClipPayload) => void;
  onGapPendingClip?: (gapIndex: number, pendingId: string) => void;
};

function gapLabel(gapIndex: number, gapCount: number): string {
  if (gapCount <= 1) return "Drop zone — add clip";
  if (gapIndex === 0) return "Before first slide";
  if (gapIndex === gapCount - 1) return "After last slide";
  return `Before slide ${gapIndex + 1}`;
}

/**
 * Column of bands over the iframe — active only while a qualifying clip drag is in flight
 * so the preview stays scrollable/clicks reach the sheet between drags.
 */
export function ExportPdfPreviewDropOverlay({
  gapCount,
  placementDragHot,
  onGapClip,
  onGapPendingClip,
}: ExportPdfPreviewDropOverlayProps) {
  const [hoverGap, setHoverGap] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!placementDragHot) setHoverGap(null);
  }, [placementDragHot]);

  if (gapCount < 1) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-[36] flex flex-col overflow-y-auto rounded-[inherit]",
        placementDragHot ? "pointer-events-auto cursor-copy" : "pointer-events-none",
      )}
      aria-hidden={!placementDragHot}
      aria-label={placementDragHot ? "PDF preview insertion zones" : undefined}
    >
      {Array.from({ length: gapCount }, (_, i) => (
        <div
          key={i}
          className={cn(
            "flex flex-[1_1_0] flex-col justify-center border border-dashed px-2 py-3 transition-[background-color,border-color]",
            "min-h-[clamp(3rem,12vh,5rem)]",
            placementDragHot
              ? hoverGap === i
                ? "border-primary bg-primary/[0.11] shadow-[inset_0_0_0_1px] shadow-primary/18"
                : "border-primary/32 bg-primary/[0.045]"
              : "border-transparent",
          )}
          onDragEnter={(e) => {
            if (!placementDragHot || !dataTransferAllowsPdfGapPlacement(e.dataTransfer)) return;
            e.preventDefault();
            e.stopPropagation();
            setHoverGap(i);
          }}
          onDragOver={(e) => {
            if (!placementDragHot || !dataTransferAllowsPdfGapPlacement(e.dataTransfer)) return;
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
            if (!placementDragHot || !dataTransferAllowsPdfGapPlacement(e.dataTransfer)) return;
            e.preventDefault();
            e.stopPropagation();
            setHoverGap(null);
            consumeExportPdfGapDrop(e.dataTransfer, i, {
              onGapPendingClip,
              onGapClip,
            });
          }}
        >
          <span
            className={cn(
              "select-none text-[10px] font-semibold tracking-wide uppercase",
              placementDragHot ? "text-foreground/90" : "text-transparent",
            )}
          >
            {gapLabel(i, gapCount)}
          </span>
          {placementDragHot ? (
            <span className="text-primary mt-1 text-[10px] font-medium">Release to insert</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
