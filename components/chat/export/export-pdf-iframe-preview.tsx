"use client";

/**
 * Screen preview of printable HTML — matches output of `buildPrintHtmlFromStagedMarkdown`.
 * Sandbox blocks scripts; `srcDoc` is app-generated escaped HTML only.
 * No wrapper chrome so the iframe shows only export styling (gradient + sheet).
 */
export function ExportPdfIframePreview({ html }: { html: string }) {
  return (
    <iframe
      title="PDF export preview"
      sandbox=""
      srcDoc={html}
      className="relative z-0 min-h-0 min-w-0 w-full flex-1 rounded-none border-0 bg-transparent shadow-none outline-none"
    />
  );
}
