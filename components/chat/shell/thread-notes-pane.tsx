"use client";

import * as React from "react";
import { FileDown, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { THREAD_NOTES_IMAGE_DRAG_MIME } from "@/lib/chat-constants";
import { exportClipPayloadFromDataTransfer } from "@/lib/conversation-export-clip";
import { cn } from "@/lib/utils";

export type ThreadNotesPaneProps = {
  notesText: string;
  onNotesTextChange: React.Dispatch<React.SetStateAction<string>>;
  onExportPdf: () => void | Promise<void>;
  onClose: () => void;
  className?: string;
};

function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const x = r.result;
      if (typeof x === "string") resolve(x);
      else reject(new Error("read failed"));
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function insertAtCaretInValue(
  value: string,
  el: HTMLTextAreaElement | null,
  insert: string,
): { next: string; caret: number } {
  if (el) {
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = `${value.slice(0, start)}${insert}${value.slice(end)}`;
    return { next, caret: start + insert.length };
  }
  return { next: value + insert, caret: value.length + insert.length };
}

export function ThreadNotesPane({
  notesText,
  onNotesTextChange,
  onExportPdf,
  onClose,
  className,
}: ThreadNotesPaneProps) {
  const taRef = React.useRef<HTMLTextAreaElement>(null);
  const [exporting, setExporting] = React.useState(false);

  const applyInsert = React.useCallback(
    (chunk: string) => {
      if (!chunk) return;
      onNotesTextChange((prev) => {
        const el = taRef.current;
        const { next, caret } = insertAtCaretInValue(prev, el, chunk);
        window.requestAnimationFrame(() => {
          const t = taRef.current;
          if (t) {
            t.focus();
            t.setSelectionRange(caret, caret);
          }
        });
        return next;
      });
    },
    [onNotesTextChange],
  );

  const runExport = React.useCallback(() => {
    setExporting(true);
    void Promise.resolve(onExportPdf()).finally(() => {
      setExporting(false);
    });
  }, [onExportPdf]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const onDrop = React.useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const dt = e.dataTransfer;

      const imgRaw = dt.getData(THREAD_NOTES_IMAGE_DRAG_MIME).trim();
      if (imgRaw) {
        try {
          const parsed = JSON.parse(imgRaw) as { src?: unknown };
          if (typeof parsed.src === "string" && parsed.src) {
            applyInsert(`\n![Image](${parsed.src})\n`);
            return;
          }
        } catch {
          /* fall through */
        }
      }

      const clip = exportClipPayloadFromDataTransfer(dt);
      if (clip?.excerpt) {
        const role = clip.role?.trim();
        const line =
          role !== undefined && role !== ""
            ? `\n[${role}] ${clip.excerpt}\n`
            : `\n${clip.excerpt}\n`;
        applyInsert(line);
        return;
      }

      if (dt.files?.length) {
        for (const file of Array.from(dt.files)) {
          if (file.type.startsWith("image/")) {
            try {
              const url = await readImageFileAsDataUrl(file);
              applyInsert(`\n![Image](${url})\n`);
            } catch {
              /* ignore */
            }
          }
        }
      }
    },
    [applyInsert],
  );

  return (
    <div
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-1 flex-col rounded-md bg-background",
        className,
      )}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex shrink-0 items-center justify-end gap-0.5 border-b border-border/70 px-1.5 py-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground size-8 shrink-0"
          disabled={exporting}
          onClick={runExport}
          title="Export notes as PDF"
          aria-label="Export notes as PDF"
        >
          <FileDown className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground size-8 shrink-0"
          onClick={onClose}
          title="Close notes"
          aria-label="Close thread notes"
        >
          <X className="size-4" />
        </Button>
      </div>
      <textarea
        ref={taRef}
        value={notesText}
        onChange={(e) => onNotesTextChange(e.target.value)}
        placeholder="Notes for this thread… Drag from chat or drop images."
        className={cn(
          "placeholder:text-muted-foreground/75 min-h-0 flex-1 resize-none border-0 bg-transparent px-3 py-2 text-sm leading-relaxed focus-visible:ring-0",
          "outline-none",
        )}
        spellCheck
        aria-label="Thread notes"
      />
    </div>
  );
}
