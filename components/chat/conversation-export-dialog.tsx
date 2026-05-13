"use client";

import * as React from "react";
import { FileText, Loader2, Presentation, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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
} from "@/lib/conversation-export-clip";
import { cn } from "@/lib/utils";
import { ExportPdfPreviewStack } from "@/components/chat/export/export-pdf-preview-stack";
import { ExportSlidesPreview } from "@/components/chat/export/export-slides-preview";

export type ConversationExportDialogProps = {
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
};

function SettingsPanel({
  settings,
  onChange,
}: {
  settings: ConversationExportSettings;
  onChange: (next: ConversationExportSettings) => void;
}) {
  return (
    <div className="bg-muted/40 mt-4 max-h-[min(52vh,26rem)] space-y-4 overflow-y-auto rounded-lg border border-border p-3 text-sm">
      <div>
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Export defaults
        </p>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          Applied when this browser builds an export draft from a chat for the first time.
          Saved locally.
        </p>
      </div>

      <div className="space-y-2 border-border border-t pt-3">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
          Draft
        </p>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border-input accent-primary"
            checked={settings.includeThreadIdLine}
            onChange={(e) =>
              onChange({ ...settings, includeThreadIdLine: e.target.checked })
            }
          />
          <span>Include thread id line in draft</span>
        </label>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border-input accent-primary"
            checked={settings.showSpeakerLabels}
            onChange={(e) =>
              onChange({ ...settings, showSpeakerLabels: e.target.checked })
            }
          />
          <span>Use speaker headings (User / Assistant)</span>
        </label>
      </div>

      <div className="space-y-3 border-border border-t pt-3">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
          PDF typography
        </p>
        <label className="flex flex-col gap-1">
          <span className="text-foreground/90">Body font</span>
          <select
            className="border-input bg-background rounded-md border px-2 py-1.5 text-sm"
            value={settings.pdfFontStack}
            onChange={(e) =>
              onChange({
                ...settings,
                pdfFontStack: e.target.value as ConversationExportSettings["pdfFontStack"],
              })
            }
          >
            <option value="sans">Sans (UI)</option>
            <option value="serif">Serif (reader)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-foreground/90">Title size</span>
          <select
            className="border-input bg-background rounded-md border px-2 py-1.5 text-sm"
            value={settings.pdfTitleScale}
            onChange={(e) =>
              onChange({
                ...settings,
                pdfTitleScale: e.target.value as ConversationExportSettings["pdfTitleScale"],
              })
            }
          >
            <option value="normal">Normal</option>
            <option value="large">Large</option>
            <option value="deck">Deck</option>
          </select>
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="text-foreground/90">Body text size (px)</span>
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
            className="w-full accent-primary"
          />
          <span className="text-muted-foreground text-xs tabular-nums">
            {settings.pdfBodyFontPx}px
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-foreground/90">Line height</span>
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
            className="w-full accent-primary"
          />
          <span className="text-muted-foreground text-xs tabular-nums">
            {settings.pdfLineHeight.toFixed(2)}
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-foreground/90">Preview sheet width (rem)</span>
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
            className="w-full accent-primary"
          />
          <span className="text-muted-foreground text-xs tabular-nums">
            {settings.pdfSheetMaxWidthRem}rem
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-foreground/90">Body measure (ch)</span>
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
            className="w-full accent-primary"
          />
          <span className="text-muted-foreground text-xs tabular-nums">
            {settings.pdfBodyMaxMeasureCh}ch
          </span>
        </div>
      </div>

      <div className="space-y-3 border-border border-t pt-3">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
          Sections and labels
        </p>
        <label className="flex flex-col gap-1">
          <span className="text-foreground/90">Section spacing</span>
          <select
            className="border-input bg-background rounded-md border px-2 py-1.5 text-sm"
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
          <span className="text-foreground/90">Between-section rule</span>
          <select
            className="border-input bg-background rounded-md border px-2 py-1.5 text-sm"
            value={settings.pdfSectionRule}
            onChange={(e) =>
              onChange({
                ...settings,
                pdfSectionRule: e.target.value as ConversationExportSettings["pdfSectionRule"],
              })
            }
          >
            <option value="hairline">Hairline</option>
            <option value="none">None</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-foreground/90">Slide title chrome</span>
          <select
            className="border-input bg-background rounded-md border px-2 py-1.5 text-sm"
            value={settings.pdfRoleStyle}
            onChange={(e) =>
              onChange({
                ...settings,
                pdfRoleStyle: e.target.value as ConversationExportSettings["pdfRoleStyle"],
              })
            }
          >
            <option value="ribbon">Ribbon</option>
            <option value="minimal">Minimal</option>
            <option value="hidden">Hidden on slides</option>
          </select>
        </label>
      </div>

      <div className="space-y-3 border-border border-t pt-3">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
          Appearance and print
        </p>
        <label className="flex flex-col gap-1">
          <span className="text-foreground/90">Color scheme</span>
          <select
            className="border-input bg-background rounded-md border px-2 py-1.5 text-sm"
            value={settings.pdfColorScheme}
            onChange={(e) =>
              onChange({
                ...settings,
                pdfColorScheme: e.target.value as ConversationExportSettings["pdfColorScheme"],
              })
            }
          >
            <option value="default">Default</option>
            <option value="high_contrast">High contrast</option>
            <option value="print_black">Print black</option>
          </select>
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="text-foreground/90">Print page margin (mm)</span>
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
            className="w-full accent-primary"
          />
          <span className="text-muted-foreground text-xs tabular-nums">
            {settings.pdfPrintMarginMm}mm
          </span>
        </div>
      </div>

      <div className="space-y-3 border-border border-t pt-3 pb-1">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
          Inline code
        </p>
        <div className="flex flex-col gap-1.5">
          <span className="text-foreground/90">Code size scale</span>
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
            className="w-full accent-primary"
          />
          <span className="text-muted-foreground text-xs tabular-nums">
            {settings.pdfCodeScale.toFixed(2)}×
          </span>
        </div>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border-input accent-primary"
            checked={settings.pdfCodeWrap}
            onChange={(e) =>
              onChange({ ...settings, pdfCodeWrap: e.target.checked })
            }
          />
          <span>Wrap long code lines</span>
        </label>
      </div>
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
  thread,
  open,
  onOpenChange,
  format,
  stagingMarkdown,
  onAppendExportClip,
}: ConversationExportDialogProps) {
  const [settings, setSettings] = React.useState<ConversationExportSettings>(() =>
    loadExportSettings(),
  );
  const [axisSelections, setAxisSelections] = React.useState<AxisSelections>(
    DEFAULT_AXIS_SELECTIONS,
  );
  const [quickStartId, setQuickStartId] =
    React.useState<ExportQuickStartPresetId | null>(EXPORT_QUICK_START_DEFAULT_ID);
  const [activePresetCategory, setActivePresetCategory] =
    React.useState<ExportPresetCategory>("quick_start");
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [pptxBusy, setPptxBusy] = React.useState(false);
  const [pdfBusy, setPdfBusy] = React.useState(false);
  const [pdfError, setPdfError] = React.useState<string | null>(null);
  const wasDialogOpenRef = React.useRef(false);

  const persistSettings = React.useCallback((next: ConversationExportSettings) => {
    const n = normalizeExportSettings(next);
    setSettings(n);
    saveExportSettings(n);
  }, []);

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
      setSettings(mergeExportSettingsFromAxes(baseline, DEFAULT_AXIS_SELECTIONS));
      setSettingsOpen(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent
        aria-describedby={undefined}
        className="flex max-h-[min(90vh,52rem)] gap-0 overflow-hidden p-0 sm:max-w-[min(96vw,52rem)]">
        <DialogHeader className="relative shrink-0 border-border border-b px-5 pb-4 pt-5">
          <DialogTitle className="text-center text-lg font-semibold tracking-tight pr-14 pl-14">
            Export
          </DialogTitle>

          <span
            className="border-primary/40 bg-primary/10 text-primary absolute top-4 left-5 inline-flex size-10 shrink-0 items-center justify-center rounded-full border"
            aria-label={format === "pdf" ? "PDF export" : "PowerPoint export"}
            title={format === "pdf" ? "PDF" : "PowerPoint"}
          >
            {format === "pdf" ? (
              <FileText className="size-5 opacity-90" aria-hidden />
            ) : (
              <Presentation className="size-5 opacity-90" aria-hidden />
            )}
          </span>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="absolute top-4 right-12 shrink-0 gap-1.5"
            onClick={() => setSettingsOpen((v) => !v)}
            aria-expanded={settingsOpen}
          >
            <Settings2 className="size-3.5" aria-hidden />
            General settings
          </Button>

          {settingsOpen ? (
            <SettingsPanel settings={settings} onChange={handleSettingsPanelChange} />
          ) : null}
        </DialogHeader>

        <div className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4">
          <fieldset className="border-0 p-0">
            <legend className="sr-only">Choose export preset</legend>
            <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wide uppercase">
              Category
            </p>
            <p className="text-muted-foreground mb-2 text-xs leading-snug">
              Quick start bundles several choices. Other categories each add one layer; they
              combine (e.g. typography + appearance + font).
            </p>
            <div
              className="custom-scrollbar flex gap-2 overflow-x-auto pb-3 [-webkit-overflow-scrolling:touch]"
              aria-label="Preset categories"
            >
              {EXPORT_PRESET_SECTION_ORDER.map((category) => {
                const selectedCat = activePresetCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    aria-current={selectedCat ? "true" : undefined}
                    onClick={() => setActivePresetCategory(category)}
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

            <p className="text-muted-foreground mb-2 mt-1 text-[11px] font-semibold tracking-wide uppercase">
              {EXPORT_PRESET_CATEGORY_LABELS[activePresetCategory]}
            </p>
            <div className="-mx-5">
              <div
                className="custom-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-visible px-5 pb-3 [-webkit-overflow-scrolling:touch] scroll-smooth"
                aria-label={`Presets for ${EXPORT_PRESET_CATEGORY_LABELS[activePresetCategory]}`}
              >
                {presetsForCategory(activePresetCategory).map((preset) => {
                  const isQuickStart = activePresetCategory === "quick_start";
                  const axisKey = CATEGORY_AXIS_KEY[activePresetCategory];
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
                      <PresetMiniPreview boxClassName={preset.boxClassName} />
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
                })}
              </div>
            </div>
          </fieldset>

          <div
            className="mt-6 flex min-h-0 flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Export preview"
          >
            <p className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wide uppercase">
              Preview
            </p>
            {format === "pdf" ? (
              <ExportPdfPreviewStack
                html={pdfPreviewHtml}
                stagingMarkdown={stagingMarkdown}
                onGapClip={previewGapClip}
              />
            ) : (
              <ExportSlidesPreview parsed={slidesParsed} />
            )}
          </div>
        </div>

        <DialogFooter className="flex shrink-0 flex-col gap-2 border-border border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
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
                <p className="text-destructive max-w-full text-xs">{pdfError}</p>
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
