"use client";

import * as React from "react";
import {
  ChevronDown,
  Code2,
  FileStack,
  FileText,
  LayoutGrid,
  Loader2,
  Palette,
  Presentation,
  Settings2,
  Type,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CATEGORY_AXIS_KEY,
  DEFAULT_AXIS_SELECTIONS,
  EXPORT_PRESET_CATEGORY_LABELS,
  EXPORT_PRESET_SECTION_ORDER,
  EXPORT_QUICK_START_DEFAULT_ID,
  mergeExportSettingsFromAxes,
  presetsForCategory,
  type AxisSelections,
  type ExportPresetCategory,
  type ExportQuickStartPreset,
  type ExportQuickStartPresetId,
} from "@/lib/conversation-export-presets";
import {
  loadExportSettings,
  normalizeExportSettings,
  saveExportSettings,
  type ConversationExportFormat,
  type ConversationExportSettings,
  type PdfHtmlLayoutSettings,
} from "@/lib/conversation-export-settings";
import {
  buildPrintHtmlFromStagedMarkdown,
  downloadPptxFromStagedMarkdown,
  downloadStagedMarkdownAsPdfFile,
} from "@/lib/conversation-export-output";
import { parseStagedExportMarkdown } from "@/lib/conversation-export-parse";
import { finalizeParsedExportForOutput } from "@/lib/export-markdown-format";
import type { Thread } from "@/lib/chat-types";
import type {
  ExportClipInsertion,
  ExportClipPayload,
  PendingExportClip,
} from "@/lib/conversation-export-clip";
import { cn } from "@/lib/utils";
import { ExportPdfPendingClipsBuffer } from "@/components/chat/export/export-pdf-pending-clips-buffer";
import { ExportPdfPreviewStack } from "@/components/chat/export/export-pdf-preview-stack";
import { ExportPdfSlideOrderRail } from "@/components/chat/export/export-pdf-slide-order-rail";
import { ExportSlidesPreview } from "@/components/chat/export/export-slides-preview";
import {
  ExportScrollFadeX,
  ExportScrollFadeY,
  type ExportScrollNavOverlap,
} from "@/components/chat/export/export-overflow-fades";

const DESKTOP_EXPORT_ALIGN_MEDIA = "(min-width: 768px)";

function useExportDialogDesktopCenterX(
  open: boolean,
  alignRef: React.RefObject<HTMLElement | null> | undefined,
): number | null {
  const [cx, setCx] = React.useState<number | null>(null);

  React.useLayoutEffect(() => {
    if (!open || !alignRef?.current) {
      setCx(null);
      return;
    }

    const el = alignRef.current;

    const sync = () => {
      if (!globalThis.matchMedia(DESKTOP_EXPORT_ALIGN_MEDIA).matches) {
        setCx(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setCx(r.left + r.width / 2);
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);

    const mq = globalThis.matchMedia(DESKTOP_EXPORT_ALIGN_MEDIA);
    mq.addEventListener("change", sync);
    globalThis.addEventListener("resize", sync);

    return () => {
      ro.disconnect();
      mq.removeEventListener("change", sync);
      globalThis.removeEventListener("resize", sync);
      setCx(null);
    };
  }, [open, alignRef]);

  return cx;
}

/** Mobile-first shell gutters — single source for header, presets column, preview, footer. */
const exportShellPadX = "px-2 sm:px-4";

/** Horizontal scroller inset when prev/next controls show (avoids chip/tile overlap). */
const exportScrollNavOverlap = {
  left: "pl-8",
  right: "pr-8",
} satisfies ExportScrollNavOverlap;

export type ConversationExportDialogProps = {
  /**
   * On `md+` viewports (Tailwind breakpoint), horizontally center the dialog on this element
   * (typically the chat `SidebarInset` column). Mobile keeps viewport-centered alignment.
   */
  desktopHorizontalAlignRef?: React.RefObject<HTMLElement | null>;
  thread: Thread | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  format: ConversationExportFormat;
  stagingMarkdown: string;
  /** When set, PDF export shows dock + preview bands and merges clips into staging markdown. */
  onAppendExportClip?: (
    payload: ExportClipPayload,
    insertion?: ExportClipInsertion,
  ) => void;
  /** Reorder `##` slide blocks in staging (PDF). */
  onReorderExportSlides?: (fromIndex: number, toIndex: number) => void;

  pendingExportClips?: readonly PendingExportClip[];
  onPlacePendingClipAtGap?: (pendingId: string, gapIndex: number) => void;
  onAppendPendingClip?: (pendingId: string) => void;
  onDismissPendingClip?: (pendingId: string) => void;
};

/** Compact icon row; each icon opens a popover with that settings group. */
function ExportSettingsPopoverBar({
  settings,
  onChange,
  className,
}: {
  settings: ConversationExportSettings;
  onChange: (next: ConversationExportSettings) => void;
  className?: string;
}) {
  const popContentClass =
    "w-[min(calc(100vw-2rem),18.5rem)] max-h-[min(70vh,21rem)] gap-2 overflow-y-auto overscroll-contain p-2.5 shadow-md";

  const labelClass = "text-foreground/85 text-[11px] font-medium leading-snug";
  const selectClass =
    "border-input bg-background h-8 rounded-md border px-2 text-xs shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring";

  const iconTriggerClass =
    "text-muted-foreground hover:text-foreground shrink-0 rounded-full border border-transparent bg-muted/40 dark:bg-muted/35 hover:border-border/40 hover:bg-muted/60 dark:hover:bg-muted/50";

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-wrap items-center justify-start gap-2",
        className,
      )}
      aria-label="Export settings"
    >
      <Popover modal={false}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className={iconTriggerClass}
            aria-label="Draft markdown defaults"
            title="Draft"
          >
            <FileStack className="size-4" strokeWidth={1.75} aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={8}
          className={popContentClass}
        >
          <p className="text-muted-foreground mb-2 rounded-md bg-muted/40 px-2 py-1.5 text-[10px] leading-snug dark:bg-muted/30">
            Applied when this browser builds an export draft. Saved locally.
          </p>
          <div className="space-y-3 pt-0.5">
            <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
              Draft
            </p>
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                className="border-input mt-0.5 size-3.5 rounded accent-primary"
                checked={settings.includeThreadIdLine}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    includeThreadIdLine: e.target.checked,
                  })
                }
              />
              <span className="text-foreground/90 text-[11px] leading-snug">
                Include thread id line in draft
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                className="border-input mt-0.5 size-3.5 rounded accent-primary"
                checked={settings.showSpeakerLabels}
                onChange={(e) =>
                  onChange({ ...settings, showSpeakerLabels: e.target.checked })
                }
              />
              <span className="text-foreground/90 text-[11px] leading-snug">
                Use speaker headings (User / Assistant)
              </span>
            </label>
          </div>
        </PopoverContent>
      </Popover>

      <Popover modal={false}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className={iconTriggerClass}
            aria-label="PDF typography"
            title="Typography"
          >
            <Type className="size-4" strokeWidth={1.75} aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={8}
          className={popContentClass}
        >
          <p className="text-muted-foreground pb-2 text-[10px] font-semibold tracking-wide uppercase">
            Typography
          </p>
          <div className="space-y-2.5">
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Body font</span>
              <select
                className={selectClass}
                value={settings.pdfFontStack}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    pdfFontStack: e.target
                      .value as ConversationExportSettings["pdfFontStack"],
                  })
                }
              >
                <option value="sans">Sans (UI)</option>
                <option value="serif">Serif (reader)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Title size</span>
              <select
                className={selectClass}
                value={settings.pdfTitleScale}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    pdfTitleScale: e.target
                      .value as ConversationExportSettings["pdfTitleScale"],
                  })
                }
              >
                <option value="normal">Normal</option>
                <option value="large">Large</option>
                <option value="deck">Deck</option>
              </select>
            </label>
            <div className="flex flex-col gap-1">
              <span className={labelClass}>Body text size (px)</span>
              <input
                type="range"
                min={11}
                max={28}
                step={1}
                value={settings.pdfBodyFontPx}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    pdfBodyFontPx: Number(e.target.value),
                  })
                }
                className="h-1.5 w-full accent-primary"
              />
              <span className="text-muted-foreground text-[10px] tabular-nums">
                {settings.pdfBodyFontPx}px
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className={labelClass}>Line height</span>
              <input
                type="range"
                min={1.35}
                max={1.85}
                step={0.05}
                value={settings.pdfLineHeight}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    pdfLineHeight: Number(e.target.value),
                  })
                }
                className="h-1.5 w-full accent-primary"
              />
              <span className="text-muted-foreground text-[10px] tabular-nums">
                {settings.pdfLineHeight.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className={labelClass}>Preview sheet width (rem)</span>
              <input
                type="range"
                min={32}
                max={52}
                step={1}
                value={settings.pdfSheetMaxWidthRem}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    pdfSheetMaxWidthRem: Number(e.target.value),
                  })
                }
                className="h-1.5 w-full accent-primary"
              />
              <span className="text-muted-foreground text-[10px] tabular-nums">
                {settings.pdfSheetMaxWidthRem}rem
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className={labelClass}>Body measure (ch)</span>
              <input
                type="range"
                min={52}
                max={78}
                step={1}
                value={settings.pdfBodyMaxMeasureCh}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    pdfBodyMaxMeasureCh: Number(e.target.value),
                  })
                }
                className="h-1.5 w-full accent-primary"
              />
              <span className="text-muted-foreground text-[10px] tabular-nums">
                {settings.pdfBodyMaxMeasureCh}ch
              </span>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Popover modal={false}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className={iconTriggerClass}
            aria-label="Sections and labels"
            title="Sections"
          >
            <LayoutGrid className="size-4" strokeWidth={1.75} aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={8}
          className={popContentClass}
        >
          <p className="text-muted-foreground pb-2 text-[10px] font-semibold tracking-wide uppercase">
            Sections &amp; labels
          </p>
          <div className="space-y-2.5">
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Section spacing</span>
              <select
                className={selectClass}
                value={settings.pdfSectionGapScale}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    pdfSectionGapScale: e.target
                      .value as ConversationExportSettings["pdfSectionGapScale"],
                  })
                }
              >
                <option value="compact">Compact</option>
                <option value="normal">Normal</option>
                <option value="roomy">Roomy</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Between-section rule</span>
              <select
                className={selectClass}
                value={settings.pdfSectionRule}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    pdfSectionRule: e.target
                      .value as ConversationExportSettings["pdfSectionRule"],
                  })
                }
              >
                <option value="hairline">Hairline</option>
                <option value="none">None</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Slide title chrome</span>
              <select
                className={selectClass}
                value={settings.pdfRoleStyle}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    pdfRoleStyle: e.target
                      .value as ConversationExportSettings["pdfRoleStyle"],
                  })
                }
              >
                <option value="ribbon">Ribbon</option>
                <option value="minimal">Minimal</option>
                <option value="hidden">Hidden on slides</option>
              </select>
            </label>
          </div>
        </PopoverContent>
      </Popover>

      <Popover modal={false}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className={iconTriggerClass}
            aria-label="Color scheme and print margin"
            title="Appearance & print"
          >
            <Palette className="size-4" strokeWidth={1.75} aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={8}
          className={popContentClass}
        >
          <p className="text-muted-foreground pb-2 text-[10px] font-semibold tracking-wide uppercase">
            Appearance &amp; print
          </p>
          <div className="space-y-2.5">
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Color scheme</span>
              <select
                className={selectClass}
                value={settings.pdfColorScheme}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    pdfColorScheme: e.target
                      .value as ConversationExportSettings["pdfColorScheme"],
                  })
                }
              >
                <option value="default">Default</option>
                <option value="high_contrast">High contrast</option>
                <option value="print_black">Print black</option>
              </select>
            </label>
            <div className="flex flex-col gap-1">
              <span className={labelClass}>Print page margin (mm)</span>
              <input
                type="range"
                min={6}
                max={28}
                step={1}
                value={settings.pdfPrintMarginMm}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    pdfPrintMarginMm: Number(e.target.value),
                  })
                }
                className="h-1.5 w-full accent-primary"
              />
              <span className="text-muted-foreground text-[10px] tabular-nums">
                {settings.pdfPrintMarginMm}mm
              </span>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Popover modal={false}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className={iconTriggerClass}
            aria-label="Inline code in PDF"
            title="Code"
          >
            <Code2 className="size-4" strokeWidth={1.75} aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={8}
          className={popContentClass}
        >
          <p className="text-muted-foreground pb-2 text-[10px] font-semibold tracking-wide uppercase">
            Inline code
          </p>
          <div className="space-y-2.5">
            <div className="flex flex-col gap-1">
              <span className={labelClass}>Code size scale</span>
              <input
                type="range"
                min={0.8}
                max={1.15}
                step={0.01}
                value={settings.pdfCodeScale}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    pdfCodeScale: Number(e.target.value),
                  })
                }
                className="h-1.5 w-full accent-primary"
              />
              <span className="text-muted-foreground text-[10px] tabular-nums">
                {settings.pdfCodeScale.toFixed(2)}×
              </span>
            </div>
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                className="border-input mt-0.5 size-3.5 rounded accent-primary"
                checked={settings.pdfCodeWrap}
                onChange={(e) =>
                  onChange({ ...settings, pdfCodeWrap: e.target.checked })
                }
              />
              <span className="text-foreground/90 text-[11px] leading-snug">
                Wrap long code lines
              </span>
            </label>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function PresetMiniPreview({ boxClassName }: { boxClassName: string }) {
  return (
    <div
      className={cn(
        "relative flex h-[4.25rem] w-full flex-col justify-center gap-1.5 overflow-hidden px-3 py-2",
        boxClassName,
      )}
    >
      <span className="bg-muted-foreground/28 h-1 w-[82%] rounded-full" />
      <span className="bg-muted-foreground/18 h-1 w-[58%] rounded-full" />
      <span className="bg-muted-foreground/14 h-1 w-full rounded-full" />
    </div>
  );
}

export function ConversationExportDialog({
  desktopHorizontalAlignRef,
  thread,
  open,
  onOpenChange,
  format,
  stagingMarkdown,
  onAppendExportClip,
  onReorderExportSlides,
  pendingExportClips = [],
  onPlacePendingClipAtGap,
  onAppendPendingClip,
  onDismissPendingClip,
}: ConversationExportDialogProps) {
  const desktopCenterX = useExportDialogDesktopCenterX(
    open,
    desktopHorizontalAlignRef,
  );

  const [settings, setSettings] = React.useState<ConversationExportSettings>(
    () => loadExportSettings(),
  );
  const [axisSelections, setAxisSelections] = React.useState<AxisSelections>(
    DEFAULT_AXIS_SELECTIONS,
  );
  const [quickStartId, setQuickStartId] =
    React.useState<ExportQuickStartPresetId | null>(
      EXPORT_QUICK_START_DEFAULT_ID,
    );
  const [activePresetCategory, setActivePresetCategory] =
    React.useState<ExportPresetCategory>("quick_start");
  const [presetsPickerExpanded, setPresetsPickerExpanded] =
    React.useState(true);
  const [pptxBusy, setPptxBusy] = React.useState(false);
  const [pdfBusy, setPdfBusy] = React.useState(false);
  const [pdfError, setPdfError] = React.useState<string | null>(null);
  const wasDialogOpenRef = React.useRef(false);

  const persistSettings = React.useCallback(
    (next: ConversationExportSettings) => {
      const n = normalizeExportSettings(next);
      setSettings(n);
      saveExportSettings(n);
    },
    [],
  );

  const handleSettingsPanelChange = React.useCallback(
    (next: ConversationExportSettings) => {
      setQuickStartId(null);
      persistSettings(next);
    },
    [persistSettings],
  );

  const pickQuickStart = React.useCallback((preset: ExportQuickStartPreset) => {
    const baseline = loadExportSettings();
    setAxisSelections(preset.axisSnapshot);
    setQuickStartId(preset.id);
    setSettings(mergeExportSettingsFromAxes(baseline, preset.axisSnapshot));
  }, []);

  const pickAxisPreset = React.useCallback(
    (key: keyof AxisSelections, presetId: string) => {
      const baseline = loadExportSettings();
      setQuickStartId(null);
      setAxisSelections((prev) => {
        const next = { ...prev, [key]: presetId } as AxisSelections;
        setSettings(mergeExportSettingsFromAxes(baseline, next));
        return next;
      });
    },
    [],
  );

  const titleFallback = thread?.title ?? "Conversation";

  React.useEffect(() => {
    const wasOpen = wasDialogOpenRef.current;
    wasDialogOpenRef.current = open;
    if (open && !wasOpen) {
      const baseline = loadExportSettings();
      setAxisSelections(DEFAULT_AXIS_SELECTIONS);
      setQuickStartId(EXPORT_QUICK_START_DEFAULT_ID);
      setSettings(
        mergeExportSettingsFromAxes(baseline, DEFAULT_AXIS_SELECTIONS),
      );
      setPresetsPickerExpanded(true);
      setPdfError(null);
    }
  }, [open]);

  const pdfLayout = React.useMemo<PdfHtmlLayoutSettings>(
    () => ({
      pdfBodyFontPx: settings.pdfBodyFontPx,
      pdfLineHeight: settings.pdfLineHeight,
      pdfSheetMaxWidthRem: settings.pdfSheetMaxWidthRem,
      pdfBodyMaxMeasureCh: settings.pdfBodyMaxMeasureCh,
      pdfFontStack: settings.pdfFontStack,
      pdfTitleScale: settings.pdfTitleScale,
      pdfSectionGapScale: settings.pdfSectionGapScale,
      pdfSectionRule: settings.pdfSectionRule,
      pdfRoleStyle: settings.pdfRoleStyle,
      pdfColorScheme: settings.pdfColorScheme,
      pdfPrintMarginMm: settings.pdfPrintMarginMm,
      pdfCodeScale: settings.pdfCodeScale,
      pdfCodeWrap: settings.pdfCodeWrap,
    }),
    [
      settings.pdfBodyFontPx,
      settings.pdfLineHeight,
      settings.pdfSheetMaxWidthRem,
      settings.pdfBodyMaxMeasureCh,
      settings.pdfFontStack,
      settings.pdfTitleScale,
      settings.pdfSectionGapScale,
      settings.pdfSectionRule,
      settings.pdfRoleStyle,
      settings.pdfColorScheme,
      settings.pdfPrintMarginMm,
      settings.pdfCodeScale,
      settings.pdfCodeWrap,
    ],
  );

  const pdfPreviewHtml = React.useMemo(
    () =>
      buildPrintHtmlFromStagedMarkdown(
        stagingMarkdown,
        titleFallback,
        pdfLayout,
      ),
    [stagingMarkdown, titleFallback, pdfLayout],
  );

  const slidesParsed = React.useMemo(
    () =>
      finalizeParsedExportForOutput(
        parseStagedExportMarkdown(stagingMarkdown, titleFallback),
      ),
    [stagingMarkdown, titleFallback],
  );

  const onDownloadPdf = React.useCallback(async () => {
    setPdfError(null);
    setPdfBusy(true);
    try {
      await downloadStagedMarkdownAsPdfFile(
        stagingMarkdown,
        titleFallback,
        pdfLayout,
      );
    } catch (err) {
      console.error(err);
      setPdfError(
        err instanceof Error ? err.message : "Could not generate PDF file.",
      );
    } finally {
      setPdfBusy(false);
    }
  }, [stagingMarkdown, titleFallback, pdfLayout]);

  const onDownloadPptx = React.useCallback(async () => {
    setPptxBusy(true);
    try {
      await downloadPptxFromStagedMarkdown(
        stagingMarkdown,
        titleFallback,
        settings.pdfBodyFontPx,
      );
    } finally {
      setPptxBusy(false);
    }
  }, [stagingMarkdown, titleFallback, settings.pdfBodyFontPx]);

  const previewGapClip = React.useCallback(
    (gapIndex: number, payload: ExportClipPayload) => {
      onAppendExportClip?.(payload, { kind: "gap", gapIndex });
    },
    [onAppendExportClip],
  );

  const previewGapPendingClip = React.useCallback(
    (gapIndex: number, pendingId: string) => {
      if (!onPlacePendingClipAtGap) return;
      onPlacePendingClipAtGap(pendingId, gapIndex);
    },
    [onPlacePendingClipAtGap],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent
        aria-describedby={undefined}
        style={desktopCenterX != null ? { left: desktopCenterX } : undefined}
        className={cn(
          "flex min-h-0 max-h-[min(calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-3.75rem),52rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(96vw,52rem)]",
          /* Top-anchored (no vertical re-center jump), with comfortable inset — not flush to the viewport top. */
          "bottom-auto translate-y-0 top-[max(3.5rem,calc(env(safe-area-inset-top,0px)+1.75rem))] sm:top-[min(7.5rem,16vh)]",
        )}
      >
        <DialogHeader className={cn("relative shrink-0 py-4", exportShellPadX)}>
          <DialogTitle className="text-center text-lg font-semibold tracking-tight px-12 sm:px-14">
            Export
          </DialogTitle>

          <span
            className="border-primary/40 bg-primary/10 text-primary absolute top-1/2 left-2 inline-flex size-10 shrink-0 -translate-y-1/2 items-center justify-center rounded-full border sm:left-4"
            aria-label={format === "pdf" ? "PDF export" : "PowerPoint export"}
            title={format === "pdf" ? "PDF" : "PowerPoint"}
          >
            {format === "pdf" ? (
              <FileText className="size-5 opacity-90" aria-hidden />
            ) : (
              <Presentation className="size-5 opacity-90" aria-hidden />
            )}
          </span>
        </DialogHeader>

        <div
          className={cn(
            "bg-popover flex max-h-[min(45svh,17.5rem)] min-h-0 flex-[0_1_auto] flex-col overflow-hidden border-border border-b sm:max-h-[min(40vh,20rem)]",
            exportShellPadX,
            "pb-3 pt-2",
          )}
        >
          <p id="export-presets-settings-heading" className="sr-only">
            Presets and settings
          </p>
          <div className="flex shrink-0 justify-center px-1 pb-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              id="export-presets-toggle"
              aria-expanded={presetsPickerExpanded}
              aria-controls="export-presets-picker"
              onClick={() => setPresetsPickerExpanded((v) => !v)}
              className="text-muted-foreground hover:text-foreground h-9 gap-2 rounded-full bg-muted/40 px-4 text-[11px] font-semibold tracking-wide uppercase dark:bg-muted/35 hover:bg-muted/60 dark:hover:bg-muted/50"
            >
              <ChevronDown
                className={cn(
                  "size-3.5 shrink-0 transition-transform duration-150",
                  presetsPickerExpanded ? "rotate-180" : "",
                )}
                aria-hidden
              />
              <span>Presets</span>
              <span className="text-muted-foreground/90 font-normal normal-case tracking-normal">
                {presetsPickerExpanded ? "Hide" : "Show"}
              </span>
            </Button>
          </div>
          <ExportScrollFadeY
            tone="popover"
            id="export-presets-settings-panel"
            role="region"
            aria-labelledby="export-presets-settings-heading"
            className="min-h-0 flex-1 pb-2"
            scrollerClassName="flex flex-col gap-3"
          >
            <div
              className={cn(
                "min-w-0",
                presetsPickerExpanded &&
                  "rounded-2xl bg-muted/40 p-2.5 pb-3.5 sm:p-3.5 sm:pb-4 dark:bg-muted/35",
              )}
            >
              <fieldset className="min-w-0 border-0 p-0">
                <legend className="sr-only">Choose export preset</legend>
                <div id="export-presets-picker">
                  {presetsPickerExpanded ? (
                    <>
                      <ExportScrollFadeX
                        tone="muted"
                        aria-label="Preset categories"
                        className="min-w-0 max-w-full pb-3"
                        navOverlap={exportScrollNavOverlap}
                      >
                        <div className="flex w-max gap-2 pb-1 pl-4 pr-3 sm:pl-6 sm:pr-4">
                          {EXPORT_PRESET_SECTION_ORDER.map((category) => {
                            const selectedCat =
                              activePresetCategory === category;
                            return (
                              <button
                                key={category}
                                type="button"
                                aria-current={selectedCat ? "true" : undefined}
                                onClick={() =>
                                  setActivePresetCategory(category)
                                }
                                className={cn(
                                  "focus-visible:ring-ring shrink-0 rounded-full border px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                                  selectedCat
                                    ? "border-primary/50 bg-primary/[0.1] text-primary"
                                    : "border-transparent bg-muted/45 text-muted-foreground hover:bg-muted/70",
                                )}
                              >
                                {EXPORT_PRESET_CATEGORY_LABELS[category]}
                              </button>
                            );
                          })}
                        </div>
                      </ExportScrollFadeX>

                      <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wide uppercase">
                        {EXPORT_PRESET_CATEGORY_LABELS[activePresetCategory]}
                      </p>
                      <ExportScrollFadeX
                        tone="muted"
                        aria-label={`Presets for ${EXPORT_PRESET_CATEGORY_LABELS[activePresetCategory]}`}
                        className="min-w-0 max-w-full"
                        navOverlap={exportScrollNavOverlap}
                        scrollerClassName="snap-x snap-mandatory scroll-smooth pb-2"
                      >
                        <div className="flex w-max gap-3 pl-5 pr-3 sm:pl-8 sm:pr-5">
                          {presetsForCategory(activePresetCategory).map(
                            (preset) => {
                              const isQuickStart =
                                activePresetCategory === "quick_start";
                              const axisKey =
                                CATEGORY_AXIS_KEY[activePresetCategory];
                              const quickTile = isQuickStart
                                ? (preset as ExportQuickStartPreset)
                                : null;
                              const selected = isQuickStart
                                ? quickStartId === preset.id
                                : axisKey !== undefined &&
                                  axisSelections[axisKey] === preset.id;

                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() =>
                                    isQuickStart && quickTile
                                      ? pickQuickStart(quickTile)
                                      : axisKey !== undefined
                                        ? pickAxisPreset(axisKey, preset.id)
                                        : undefined
                                  }
                                  className={cn(
                                    "flex shrink-0 snap-start flex-col items-center gap-1.5 rounded-xl border border-transparent p-1.5 text-center outline-none transition-shadow",
                                    isQuickStart ? "w-[11rem]" : "w-[9.25rem]",
                                    "hover:bg-muted/35 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                    selected &&
                                      "border-primary/40 bg-primary/[0.06] ring-2 ring-primary ring-offset-2 ring-offset-background",
                                  )}
                                >
                                  <PresetMiniPreview
                                    boxClassName={preset.boxClassName}
                                  />
                                  <span className="text-foreground px-1 text-xs font-medium leading-snug">
                                    {preset.title}
                                  </span>
                                  {quickTile ? (
                                    <span className="text-muted-foreground line-clamp-2 min-h-[2.5rem] px-1 text-[10px] leading-snug">
                                      {quickTile.subtitle}
                                    </span>
                                  ) : null}
                                </button>
                              );
                            },
                          )}
                        </div>
                      </ExportScrollFadeX>
                    </>
                  ) : null}
                </div>
              </fieldset>
            </div>

            <div className="min-w-0 rounded-2xl bg-muted/40 p-2.5 pb-3.5 sm:p-3.5 sm:pb-4 dark:bg-muted/35">
              <p className="text-muted-foreground mb-1.5 flex items-center gap-2 text-[11px] font-semibold tracking-wide uppercase">
                <Settings2 className="size-3.5 shrink-0" aria-hidden />
                Settings
              </p>
              <ExportSettingsPopoverBar
                settings={settings}
                onChange={handleSettingsPanelChange}
              />
            </div>
          </ExportScrollFadeY>
        </div>

        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col pt-3 pb-4",
            exportShellPadX,
          )}
        >
          <div
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-muted/25 px-2.5 py-2.5 sm:px-3.5 sm:py-3 dark:bg-muted/15 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Export preview"
          >
            <p className="text-muted-foreground mb-2 shrink-0 text-[11px] font-medium tracking-wide uppercase">
              Preview
            </p>
            {format === "pdf" &&
            pendingExportClips.length > 0 &&
            onAppendPendingClip &&
            onDismissPendingClip ? (
              <ExportPdfPendingClipsBuffer
                clips={pendingExportClips}
                onAppendToEnd={onAppendPendingClip}
                onDismiss={onDismissPendingClip}
              />
            ) : null}
            {format === "pdf" && onReorderExportSlides ? (
              <ExportPdfSlideOrderRail
                titles={slidesParsed.slides.map(
                  (s) => s.title?.trim() || "Untitled slide",
                )}
                onReorder={onReorderExportSlides}
              />
            ) : null}
            {format === "pdf" ? (
              <ExportPdfPreviewStack
                html={pdfPreviewHtml}
                stagingMarkdown={stagingMarkdown}
                pendingPlacementClipCount={pendingExportClips.length}
                onGapClip={previewGapClip}
                onGapPendingClip={
                  onPlacePendingClipAtGap ? previewGapPendingClip : undefined
                }
                className="min-h-0 flex-1"
              />
            ) : (
              <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
                <ExportSlidesPreview parsed={slidesParsed} />
              </div>
            )}
          </div>
        </div>

        <DialogFooter
          className={cn(
            "flex shrink-0 flex-col gap-2 rounded-t-2xl bg-muted/30 py-4 dark:bg-muted/20 sm:flex-row sm:items-center sm:justify-between",
            exportShellPadX,
          )}
        >
          {format === "pdf" ? (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  onClick={() => void onDownloadPdf()}
                  disabled={pdfBusy}
                  className="gap-2"
                >
                  {pdfBusy ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <FileText className="size-4 opacity-90" aria-hidden />
                  )}
                  Download PDF
                </Button>
              </div>
              {pdfError ? (
                <p className="text-destructive max-w-full text-xs">
                  {pdfError}
                </p>
              ) : (
                <p className="text-muted-foreground max-w-xl text-xs">
                  Saves a file to your device (generated in the browser).
                </p>
              )}
            </>
          ) : (
            <Button
              type="button"
              onClick={() => void onDownloadPptx()}
              disabled={pptxBusy}
              className="gap-2"
            >
              {pptxBusy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Presentation className="size-4 opacity-90" aria-hidden />
              )}
              Download .pptx
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
