/** True while a drag began from the export clip floating handle (client-only). */
let domExportClipDragActive = false

export function setExportClipDomDragActive(next: boolean): void {
  domExportClipDragActive = next
}

export function isExportClipDomDragActive(): boolean {
  return domExportClipDragActive
}
