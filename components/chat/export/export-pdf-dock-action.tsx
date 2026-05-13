"use client";

import * as React from "react";
import { FileText, GripVertical } from "lucide-react";

import {
  EXPORT_CLIP_DRAG_CURSOR_HTML_CLASS,
  exportClipPayloadFromDataTransfer,
  type ExportClipPayload,
} from "@/lib/conversation-export-clip";
import { THREAD_DRAG_MIME } from "@/lib/chat-constants";
import { cn } from "@/lib/utils";

function dataTransferLooksLikeClipOrPlainTextDrag(dt: DataTransfer | null): boolean {
  if (!dt) return false;
  const types = Array.from(dt.types);
  if (types.includes(THREAD_DRAG_MIME)) return false;
  if (types.includes("Files")) return false;
  return true;
}

export type PdfDockActionProps = {
  onClip: (payload: ExportClipPayload) => void;
  /** PDF export dialog open for this workspace — biases dock toward expanded chrome */
  workspaceActive?: boolean;
};

function consumeClipboardPaste(e: React.ClipboardEvent): ExportClipPayload | null {
  const text = e.clipboardData?.getData("text/plain").trim();
  if (!text) return null;
  return { excerpt: text };
}

export function PdfDockAction({
  onClip,
  workspaceActive = false,
}: PdfDockActionProps) {
  const dropZoneRef = React.useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [pulse, setPulse] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const [globalDrag, setGlobalDrag] = React.useState(false);

  React.useEffect(() => {
    const start = (e: DragEvent) => {
      if (dataTransferLooksLikeClipOrPlainTextDrag(e.dataTransfer)) {
        document.documentElement.classList.add(EXPORT_CLIP_DRAG_CURSOR_HTML_CLASS);
      }
      setGlobalDrag(true);
    };
    const end = () => {
      document.documentElement.classList.remove(EXPORT_CLIP_DRAG_CURSOR_HTML_CLASS);
      setGlobalDrag(false);
    };
    document.addEventListener("dragstart", start);
    document.addEventListener("dragend", end);
    document.addEventListener("drop", end);
    return () => {
      document.removeEventListener("dragstart", start);
      document.removeEventListener("dragend", end);
      document.removeEventListener("drop", end);
      document.documentElement.classList.remove(EXPORT_CLIP_DRAG_CURSOR_HTML_CLASS);
    };
  }, []);

  const flashOk = React.useCallback(() => {
    setPulse(true);
    window.setTimeout(() => setPulse(false), 380);
  }, []);

  const applyPayload = React.useCallback(
    (payload: ExportClipPayload | null) => {
      if (!payload) return false;
      const excerpt = payload.excerpt.trim();
      if (!excerpt) return false;
      onClip({ role: payload.role, excerpt });
      flashOk();
      return true;
    },
    [flashOk, onClip],
  );

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOver(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    const next = e.relatedTarget as Node | null;
    if (next && dropZoneRef.current?.contains(next)) return;
    setDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const payload = exportClipPayloadFromDataTransfer(e.dataTransfer);
    applyPayload(payload);
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const payload = consumeClipboardPaste(e);
    if (!payload?.excerpt) return;
    e.preventDefault();
    applyPayload(payload);
  };

  const expanded =
    workspaceActive || hovered || dragOver || globalDrag;

  return (
    <div
      className="pointer-events-none fixed inset-y-0 right-0 z-[56] hidden max-w-[100vw] items-center sm:flex"
      aria-hidden={false}
    >
      {/* Wide left padding = cursor “near” right edge expands dock before touching the pill */}
      <div
        className={cn(
          "pointer-events-auto flex h-full max-w-[min(100vw,24rem)] origin-right flex-col justify-center py-10 pl-16 pr-4 transition-[transform,max-width,opacity,filter,box-shadow] duration-700 ease-[cubic-bezier(0.22,1.42,0.32,1)] motion-reduce:transition-none sm:py-14 sm:pl-28 sm:pr-5",
          expanded
            ? "translate-x-0 scale-100 opacity-100 blur-0"
            : "translate-x-2 scale-[0.76] opacity-[0.58] blur-[1.25px] saturate-[0.88]",
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          ref={dropZoneRef}
          role="region"
          aria-label="Dock — drop or paste chat text for PDF export"
          tabIndex={0}
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onPaste={onPaste}
          className={cn(
            "flex flex-col items-center justify-center rounded-2xl border border-dashed outline-none transition-[min-height,min-width,gap,padding,colors,box-shadow] duration-700 ease-[cubic-bezier(0.22,1.42,0.32,1)] motion-reduce:transition-none",
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "border-border bg-popover/95 shadow-xl shadow-black/10 ring-1 ring-border/60 backdrop-blur-md dark:shadow-black/25",
            expanded
              ? "min-h-[9rem] min-w-[6.25rem] gap-4 px-5 py-6 shadow-2xl ring-primary/15"
              : "min-h-[6.75rem] min-w-[4.25rem] gap-3 px-3 py-5",
            (dragOver || globalDrag) && "cursor-copy",
            dragOver
              ? "border-primary/55 bg-primary/[0.08]"
              : "hover:border-border hover:bg-muted/30",
            pulse && "border-primary/45 bg-primary/[0.09]",
          )}
        >
          <FileText
            className={cn(
              "text-primary shrink-0 opacity-90 transition-[width,height] duration-700 motion-reduce:transition-none",
              expanded ? "size-9 sm:size-10" : "size-7 sm:size-8",
            )}
            aria-hidden
          />
          <GripVertical
            className={cn(
              "text-muted-foreground shrink-0 transition-[width,height] duration-700 motion-reduce:transition-none",
              expanded ? "size-7 sm:size-8" : "size-5 sm:size-6",
            )}
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
