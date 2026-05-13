"use client"

import * as React from "react"

/** JSON `{ "ids": string[] }` — ordered thread ids in a library group. */
export const THREAD_GROUP_DRAG_MIME = "application/x-ali-chat-thread-group"
export const TAB_DRAG_MIME = "application/x-ali-chat-tab"

const PIN_DRAG_PX = 36

export function threadTitleInitials(title: string): string {
  const parts = title
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Elements marked with this attribute are cloned for library → pins drag preview. */
export const PIN_DRAG_PREVIEW_SOURCE_SELECTOR = "[data-pin-drag-preview-source]"

/** Custom drag image: square chip with initials (like pin tabs), not the full row. */
export function setPinThreadDragPreview(
  e: React.DragEvent,
  title: string,
): void {
  const dt = e.dataTransfer
  if (!dt) return

  const el = document.createElement("div")
  el.className = "pin-drag-preview-ghost"
  el.textContent = threadTitleInitials(title)
  el.setAttribute("aria-hidden", "true")
  document.body.appendChild(el)

  const half = PIN_DRAG_PX / 2
  dt.setDragImage(el, half, half)

  const remove = () => {
    el.remove()
  }
  document.addEventListener("dragend", remove, { once: true })
  window.setTimeout(remove, 8000)
}

/**
 * Drag preview by cloning a visible node (e.g. colored Lucide icon in the library).
 * Hotspot follows the pointer relative to `source`.
 */
export function setPinDragPreviewFromElement(
  e: React.DragEvent,
  source: HTMLElement,
): void {
  const dt = e.dataTransfer
  if (!dt) return

  const rect = source.getBoundingClientRect()
  const clone = source.cloneNode(true) as HTMLElement
  clone.classList.add("pin-drag-preview-icon-clone")
  clone.removeAttribute("data-pin-drag-preview-source")
  clone.setAttribute("aria-hidden", "true")

  Object.assign(clone.style, {
    position: "fixed",
    left: "0",
    top: "0",
    margin: "0",
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    boxSizing: "border-box",
    pointerEvents: "none",
    zIndex: "2147483647",
  })

  document.body.appendChild(clone)

  const offX = Math.min(Math.max(e.clientX - rect.left, 0), rect.width)
  const offY = Math.min(Math.max(e.clientY - rect.top, 0), rect.height)

  dt.setDragImage(clone, offX, offY)

  const remove = () => {
    clone.remove()
  }
  document.addEventListener("dragend", remove, { once: true })
  window.setTimeout(remove, 8000)
}
