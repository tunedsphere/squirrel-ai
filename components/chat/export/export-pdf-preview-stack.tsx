"use client";

import * as React from "react";

import {
  countExportStagingGaps,
  dataTransferAllowsPdfGapPlacement,
  type ExportClipPayload,
} from "@/lib/conversation-export-clip";
import { ExportPdfGapDropRail } from "@/components/chat/export/export-pdf-gap-drop-rail";
import { ExportPdfIframePreview } from "@/components/chat/export/export-pdf-iframe-preview";
import { ExportPdfPreviewDropOverlay } from "@/components/chat/export/export-pdf-preview-drop-overlay";
import { cn } from "@/lib/utils";

export type ExportPdfPreviewStackProps = {
  html: string;
  stagingMarkdown: string;
  onGapClip: (gapIndex: number, payload: ExportClipPayload) => void;
  onGapPendingClip?: (gapIndex: number, pendingId: string) => void;
  /** Used for placement-rail hint copy when clips are queued. */
  pendingPlacementClipCount?: number;
  className?: string;
};

export function ExportPdfPreviewStack({
  html,
  stagingMarkdown,
  onGapClip,
  onGapPendingClip,
  pendingPlacementClipCount = 0,
  className,
}: ExportPdfPreviewStackProps) {
  const gapCount = countExportStagingGaps(stagingMarkdown);
  const [placementDragHot, setPlacementDragHot] = React.useState(false);

  React.useEffect(() => {
    const armIfClip = (dt: DataTransfer | null) => {
      if (dataTransferAllowsPdfGapPlacement(dt)) {
        setPlacementDragHot(true);
      }
    };

    const onDragStart = (e: DragEvent) => {
      queueMicrotask(() => armIfClip(e.dataTransfer));
    };

    const onDrag = (e: DragEvent) => {
      armIfClip(e.dataTransfer);
    };

    const disarm = () => {
      setPlacementDragHot(false);
    };

    document.addEventListener("dragstart", onDragStart, true);
    document.addEventListener("drag", onDrag, true);
    document.addEventListener("dragend", disarm, true);
    window.addEventListener("drop", disarm);
    return () => {
      document.removeEventListener("dragstart", onDragStart, true);
      document.removeEventListener("drag", onDrag, true);
      document.removeEventListener("dragend", disarm, true);
      window.removeEventListener("drop", disarm);
    };
  }, []);

  return (
    <div
      className={cn(
        "relative flex min-h-[min(280px,38vh)] flex-1 flex-col overflow-hidden rounded-md border border-border/50 bg-muted/15 sm:min-h-[min(320px,42vh)] dark:bg-muted/12",
        className,
      )}
    >
      <ExportPdfGapDropRail
        gapCount={gapCount}
        placementDragHot={placementDragHot}
        pendingQueueTip={pendingPlacementClipCount > 0}
        onGapClip={onGapClip}
        onGapPendingClip={onGapPendingClip}
      />
      <div className="relative min-h-0 flex-1">
        <ExportPdfIframePreview html={html} />
        <ExportPdfPreviewDropOverlay
          gapCount={gapCount}
          placementDragHot={placementDragHot}
          onGapClip={onGapClip}
          onGapPendingClip={onGapPendingClip}
        />
      </div>
    </div>
  );
}
