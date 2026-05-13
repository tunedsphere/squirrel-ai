"use client";

import * as React from "react";

import {
  exportClipPayloadFromDataTransfer,
  type ExportClipPayload,
} from "@/lib/conversation-export-clip";
import { cn } from "@/lib/utils";

export type ExportPdfPreviewDropOverlayProps = {
  gapCount: number;
  onGapClip: (gapIndex: number, payload: ExportClipPayload) => void;
};

function gapLabel(gapIndex: number, gapCount: number): string {
  if (gapCount <= 1) return "Drop to insert";
  if (gapIndex === 0) return "Before first section";
  if (gapIndex === gapCount - 1) return "After last section";
  return `Before section ${gapIndex + 1}`;
}

/**
 * Transparent column of drop bands over the PDF iframe. Uses hit-testing only while a system
 * drag is active so the iframe stays scrollable between drags.
 */
export function ExportPdfPreviewDropOverlay({
  gapCount,
  onGapClip,
}: ExportPdfPreviewDropOverlayProps) {
  const [dragActive, setDragActive] = React.useState(false);
  const [hoverGap, setHoverGap] = React.useState<number | null>(null);

  React.useEffect(() => {
    const end = () => {
      setDragActive(false);
      setHoverGap(null);
    };
    window.addEventListener("dragend", end);
    window.addEventListener("drop", end);
    return () => {
      window.removeEventListener("dragend", end);
      window.removeEventListener("drop", end);
    };
  }, []);

  React.useEffect(() => {
    const start = () => setDragActive(true);
    document.addEventListener("dragstart", start, true);
    return () => document.removeEventListener("dragstart", start, true);
  }, []);

  if (gapCount < 1) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex flex-col overflow-hidden rounded-[inherit]",
        dragActive ? "pointer-events-auto cursor-copy" : "pointer-events-none",
      )}
      aria-label="PDF preview drop zones"
    >
      {Array.from({ length: gapCount }, (_, i) => (
        <div
          key={i}
          className={cn(
            "flex min-h-[2.25rem] flex-1 flex-col justify-center border border-dashed border-transparent px-1.5 transition-colors",
            dragActive && hoverGap === i && "border-primary/50 bg-primary/[0.07]",
          )}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setHoverGap(i);
          }}
          onDragOver={(e) => {
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
            e.preventDefault();
            e.stopPropagation();
            setHoverGap(null);
            const payload = exportClipPayloadFromDataTransfer(e.dataTransfer);
            if (!payload) return;
            const excerpt = payload.excerpt.trim();
            if (!excerpt) return;
            onGapClip(i, { role: payload.role, excerpt });
          }}
        >
          <span
            className={cn(
              "select-none text-[10px] font-medium tracking-wide uppercase",
              dragActive
                ? "text-muted-foreground"
                : "text-muted-foreground/0",
            )}
          >
            {gapLabel(i, gapCount)}
          </span>
        </div>
      ))}
    </div>
  );
}
