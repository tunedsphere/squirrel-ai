"use client";

import * as React from "react";
import { GripVertical } from "lucide-react";

import { EXPORT_STAGING_SLIDE_REORDER_MIME } from "@/lib/conversation-export-clip";
import { cn } from "@/lib/utils";

export type ExportPdfSlideOrderRailProps = {
  titles: readonly string[];
  onReorder: (fromIndex: number, toIndex: number) => void;
};

/** Drag chips to reorder `##` slide blocks — matches `reorderExportStagingSlidesByIndex` indices. */
export function ExportPdfSlideOrderRail({ titles, onReorder }: ExportPdfSlideOrderRailProps) {
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = React.useState<number | null>(null);
  const [reduceMotion, setReduceMotion] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  if (titles.length < 2) return null;

  return (
    <div
      className="mb-2 flex min-h-[2rem] flex-wrap items-center gap-1.5"
      aria-label="Section order — drag to reorder slides in the staged export"
      onDragLeave={(e) => {
        if (
          !(e.target instanceof HTMLElement) ||
          !e.currentTarget.contains(e.relatedTarget as Node)
        ) {
          setHoverIndex(null);
        }
      }}
    >
      <span className="text-muted-foreground shrink-0 text-[10px] font-semibold tracking-wide uppercase">
        Slide order
      </span>
      {reduceMotion ? (
        <span className="text-muted-foreground text-[10px] leading-tight">
          Reordering is disabled when reduced motion is on.
        </span>
      ) : null}
      {titles.map((title, i) => {
        const hovered = hoverIndex === i && draggingIndex != null && draggingIndex !== i;
        return (
          <div
            key={`slide-order-${i}`}
            draggable={!reduceMotion}
            onDragStart={(e) => {
              if (reduceMotion) {
                e.preventDefault();
                return;
              }
              setDraggingIndex(i);
              e.dataTransfer.setData(
                EXPORT_STAGING_SLIDE_REORDER_MIME,
                JSON.stringify({ fromIndex: i }),
              );
              e.dataTransfer.effectAllowed = "move";
              if (typeof e.dataTransfer.setDragImage === "function") {
                e.dataTransfer.setDragImage(e.currentTarget, 16, 12);
              }
            }}
            onDragEnd={() => {
              setDraggingIndex(null);
              setHoverIndex(null);
            }}
            onDragEnter={(ev) => {
              ev.preventDefault();
              ev.dataTransfer.dropEffect = "move";
              setHoverIndex(i);
            }}
            onDragOver={(ev) => {
              ev.preventDefault();
              ev.dataTransfer.dropEffect = "move";
              setHoverIndex(i);
            }}
            onDrop={(ev) => {
              ev.preventDefault();
              setHoverIndex(null);
              setDraggingIndex(null);
              const raw = ev.dataTransfer.getData(EXPORT_STAGING_SLIDE_REORDER_MIME).trim();
              if (!raw) return;
              let fromIdx = NaN;
              try {
                const j = JSON.parse(raw) as { fromIndex?: unknown };
                fromIdx = typeof j.fromIndex === "number" ? j.fromIndex : NaN;
              } catch {
                return;
              }
              if (
                Number.isFinite(fromIdx) &&
                fromIdx >= 0 &&
                fromIdx < titles.length &&
                fromIdx !== i
              ) {
                onReorder(Math.floor(fromIdx), i);
              }
            }}
            className={cn(
              "border-border/85 bg-muted/35 text-foreground/90 relative flex max-w-[10.5rem] touch-manipulation items-center gap-0.5 rounded-lg border px-1.5 py-1 shadow-sm select-none dark:bg-muted/30",
              "motion-safe:transition-[background-color,border-color,opacity,transform]",
              reduceMotion ? "cursor-default" : "cursor-grab",
              draggingIndex === i && "opacity-45",
              hovered && "border-primary/45 bg-primary/[0.08] ring-ring/25 ring-1",
            )}
            title={
              reduceMotion
                ? title
                : `${title} — drag onto another slide chip to reorder`
            }
          >
            {!reduceMotion ? (
              <GripVertical className="text-muted-foreground size-4 shrink-0 opacity-85" aria-hidden />
            ) : null}
            <span className="min-w-0 flex-1 truncate text-[11px] font-medium leading-tight">{title}</span>
          </div>
        );
      })}
    </div>
  );
}
