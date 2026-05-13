"use client";

import {
  countExportStagingGaps,
  type ExportClipPayload,
} from "@/lib/conversation-export-clip";
import { ExportPdfIframePreview } from "@/components/chat/export/export-pdf-iframe-preview";
import { ExportPdfPreviewDropOverlay } from "@/components/chat/export/export-pdf-preview-drop-overlay";
import { cn } from "@/lib/utils";

export type ExportPdfPreviewStackProps = {
  html: string;
  stagingMarkdown: string;
  onGapClip: (gapIndex: number, payload: ExportClipPayload) => void;
  className?: string;
};

export function ExportPdfPreviewStack({
  html,
  stagingMarkdown,
  onGapClip,
  className,
}: ExportPdfPreviewStackProps) {
  const gapCount = countExportStagingGaps(stagingMarkdown);

  return (
    <div
      className={cn(
        "relative flex min-h-[min(280px,38vh)] flex-1 flex-col overflow-hidden rounded-md sm:min-h-[min(320px,42vh)]",
        className,
      )}
    >
      <ExportPdfIframePreview html={html} />
      <ExportPdfPreviewDropOverlay gapCount={gapCount} onGapClip={onGapClip} />
    </div>
  );
}
