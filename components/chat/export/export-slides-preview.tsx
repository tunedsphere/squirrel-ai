"use client";

import type { ParsedStagedExport } from "@/lib/conversation-export-parse";
import {
  exportMarkdownLineToBlockHtml,
  isExportSpeakerRoleTitle,
  renderExportInlineMarkdownToHtml,
} from "@/lib/export-markdown-format";
import { cn } from "@/lib/utils";

const slideShell =
  "relative flex aspect-video w-full max-w-full shrink-0 flex-col overflow-hidden rounded-xl border border-border/85 bg-gradient-to-br from-background via-background to-muted/30 py-5 pr-5 pl-6 shadow-[0_12px_42px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.045] before:pointer-events-none before:absolute before:inset-y-[10%] before:left-0 before:w-[3px] before:rounded-full before:bg-[#4f46e5] before:content-[''] dark:ring-white/[0.06]";

function BulletBlocks({
  lines,
  dotClass,
}: {
  lines: string[];
  dotClass: string;
}) {
  return (
    <div className="space-y-2.5">
      {lines.map((line, i) => (
        <div key={`${line}-${i}`} className="flex gap-2.5">
          <span
            className={cn(
              "mt-[0.45em] h-1 w-1 shrink-0 rounded-full",
              dotClass,
            )}
            aria-hidden
          />
          <div
            className="text-foreground/90 prose-export-slide min-w-0 flex-1 text-[13px] leading-relaxed sm:text-sm [&_.export-md-h]:text-foreground [&_.export-md-h]:tracking-tight [&_.export-md-h-deep]:font-semibold [&_.export-p:first-child]:mt-0 [&_p]:m-0"
            dangerouslySetInnerHTML={{ __html: exportMarkdownLineToBlockHtml(line) }}
          />
        </div>
      ))}
    </div>
  );
}

function OverviewCard({ bullets }: { bullets: string[] }) {
  return (
    <div
      className={cn(
        slideShell,
        "border-dashed from-muted/35 to-muted/15 before:bg-[#6366f1]/90",
      )}
    >
      <div className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-[0.14em] uppercase">
        Overview
      </div>
      <BulletBlocks lines={bullets} dotClass="bg-indigo-500/90" />
    </div>
  );
}

function SlideCard({
  index,
  total,
  title,
  bullets,
}: {
  index: number;
  total: number;
  title: string;
  bullets: string[];
}) {
  const items = bullets.length ? bullets : [" "];
  const hideSpeakerTitle = isExportSpeakerRoleTitle(title);

  return (
    <div className={slideShell}>
      <div className="text-muted-foreground mb-2 flex items-baseline gap-2 text-[10px] font-semibold tracking-[0.14em] uppercase">
        <span className="text-indigo-700/90 dark:text-indigo-300/90">Slide</span>
        <span className="text-foreground/65 tabular-nums">
          {index} / {total}
        </span>
      </div>
      {!hideSpeakerTitle ? (
        <div
          className="text-foreground mb-3 text-base font-semibold leading-snug tracking-tight sm:text-lg [&_code]:text-sm [&_em]:font-serif [&_strong]:font-bold"
          dangerouslySetInnerHTML={{
            __html: renderExportInlineMarkdownToHtml(title),
          }}
        />
      ) : null}
      <BulletBlocks lines={items} dotClass="bg-slate-400/95 dark:bg-slate-500/90" />
    </div>
  );
}

export type ExportSlidesPreviewProps = {
  parsed: ParsedStagedExport;
};

/** Structural preview mirroring pptx slides — markdown-aware for body lines. */
export function ExportSlidesPreview({ parsed }: ExportSlidesPreviewProps) {
  const hasContent =
    parsed.preambleLines.length > 0 || parsed.slides.some((s) => s.title || s.bullets.length > 0);

  if (!hasContent) {
    return (
      <div className="text-muted-foreground flex min-h-[min(360px,48vh)] flex-col items-center justify-center rounded-xl border border-dashed border-border/90 bg-gradient-to-br from-muted/35 via-muted/15 to-muted/25 p-10 text-center text-sm shadow-inner sm:min-h-[min(400px,52vh)]">
        <p className="text-foreground/90 mb-1 max-w-sm font-medium">Nothing to preview yet</p>
        <p className="max-w-sm text-muted-foreground">
          Add headings and body text in Source to preview slides here.
        </p>
      </div>
    );
  }

  return (
    <div
      className="custom-scrollbar flex min-h-[min(360px,48vh)] min-w-0 flex-1 flex-col gap-4 overflow-y-auto py-1 sm:min-h-[min(400px,52vh)]"
      role="region"
      aria-label="PowerPoint slide preview"
    >
      {parsed.preambleLines.length > 0 ? (
        <OverviewCard bullets={parsed.preambleLines} />
      ) : null}
      {(parsed.slides.length ? parsed.slides : []).map((s, idx) => (
        <SlideCard
          key={`${s.title}-${idx}`}
          index={idx + 1}
          total={Math.max(parsed.slides.length, 1)}
          title={s.title?.trim() || "Untitled slide"}
          bullets={s.bullets}
        />
      ))}
    </div>
  );
}
