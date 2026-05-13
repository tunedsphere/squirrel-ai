"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import {
  BrainCircuit,
  FileCode,
  FileText,
  Presentation,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const plusButtonClass =
  "size-10 shrink-0 rounded-full border border-transparent bg-muted/40 text-muted-foreground shadow-none " +
  "backdrop-blur-xs transition-colors transition-transform duration-200 " +
  "hover:border-border hover:bg-muted/65 hover:text-foreground " +
  "dark:bg-muted/30 dark:hover:bg-muted/50 ";

const pillClass =
  "inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-muted/35 px-3.5 py-2 " +
  "text-sm font-medium text-foreground shadow-none backdrop-blur-xs " +
  "transition-colors hover:bg-muted/70 hover:border-border " +
  "dark:bg-muted/25 dark:hover:bg-muted/45 ";

export type ConversationComposerPlusActionsProps = {
  onExportPdf: () => void;
  onExportPowerpoint: () => void;
  onExportMarkdown: () => void;
  onQuizMe?: () => void;
  quizMeDisabled?: boolean;
};

export function ConversationComposerPlusActions({
  onExportPdf,
  onExportPowerpoint,
  onExportMarkdown,
  onQuizMe,
  quizMeDisabled,
}: ConversationComposerPlusActionsProps) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handleDocDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleDocDown);
    return () => document.removeEventListener("mousedown", handleDocDown);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const acts = React.useMemo(() => {
    const rows: Array<{
      key: string;
      label: string;
      Icon: LucideIcon;
      onClick: () => void;
      disabled?: boolean;
    }> = [
      {
        key: "pdf",
        label: "PDF",
        Icon: FileText,
        onClick: onExportPdf,
      },
      {
        key: "pptx",
        label: "PowerPoint",
        Icon: Presentation,
        onClick: onExportPowerpoint,
      },
      {
        key: "md",
        label: "Markdown",
        Icon: FileCode,
        onClick: onExportMarkdown,
      },
    ];
    if (onQuizMe) {
      rows.push({
        key: "quiz",
        label: "Quiz Me",
        Icon: BrainCircuit,
        onClick: onQuizMe,
        disabled: quizMeDisabled,
      });
    }
    return rows;
  }, [
    onExportMarkdown,
    onExportPdf,
    onExportPowerpoint,
    onQuizMe,
    quizMeDisabled,
  ]);

  return (
    <div ref={rootRef} className="flex min-w-0 items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={cn(
          plusButtonClass,
          open && "border-border bg-muted/55 text-foreground",
        )}
        aria-label={open ? "Hide composer actions" : "Show composer actions"}
        aria-expanded={open}
        aria-controls={open ? "composer-export-actions-row" : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <Plus className={cn("size-[1.125rem]", open && "rotate-45")} aria-hidden />
      </Button>

      {open ? (
        <div
          id="composer-export-actions-row"
          role="group"
          aria-label="Composer actions"
          className={cn(
            "flex min-w-0 items-center gap-2",
            "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-left-2 motion-safe:duration-[260ms] motion-safe:ease-out motion-safe:fill-mode-both",
          )}
        >
          {acts.map(({ key, label, Icon, onClick, disabled }) => (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => {
                setOpen(false);
                onClick();
              }}
              className={pillClass}
            >
              <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span>{label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
