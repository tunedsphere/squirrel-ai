"use client";

import * as React from "react";
import {
  Archive,
  ExternalLink,
  FileCode,
  FileDown,
  FileText,
  Presentation,
  PencilLine,
  Pin,
  PinOff,
  Share2,
  Trash2,
} from "lucide-react";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export type HistoryThreadContextMenuProps = {
  children: React.ReactNode;
  isPinned: boolean;
  pinDisabled: boolean;
  onTogglePin: () => void;
  onShare: () => void;
  onOpenNewTab: () => void;
  onRename: () => void;
  onExportMarkdown: () => void;
  onExportPdf: () => void;
  onExportPowerpoint: () => void;
  onArchive: () => void;
  onDeletePermanently: () => void;
};

export function HistoryThreadContextMenu({
  children,
  isPinned,
  pinDisabled,
  onTogglePin,
  onShare,
  onOpenNewTab,
  onRename,
  onExportMarkdown,
  onExportPdf,
  onExportPowerpoint,
  onArchive,
  onDeletePermanently,
}: HistoryThreadContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="min-w-0 w-full">{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-48">
        <ContextMenuItem
          disabled={!isPinned && pinDisabled}
          onSelect={() => {
            onTogglePin();
          }}
        >
          {isPinned ? (
            <PinOff className="size-4" aria-hidden />
          ) : (
            <Pin className="size-4" aria-hidden />
          )}
          {isPinned ? "Unpin" : "Pin"}
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() => {
            onShare();
          }}
        >
          <Share2 className="size-4" aria-hidden />
          Share
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() => {
            onOpenNewTab();
          }}
        >
          <ExternalLink className="size-4" aria-hidden />
          Open new tab
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() => {
            onRename();
          }}
        >
          <PencilLine className="size-4" aria-hidden />
          Rename
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <FileDown className="size-4" aria-hidden />
            Export as
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="min-w-40">
            <ContextMenuItem
              onSelect={() => {
                onExportPdf();
              }}
            >
              <FileText className="size-4" aria-hidden />
              PDF
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() => {
                onExportPowerpoint();
              }}
            >
              <Presentation className="size-4" aria-hidden />
              PowerPoint
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() => {
                onExportMarkdown();
              }}
            >
              <FileCode className="size-4" aria-hidden />
              Markdown
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem
          onSelect={() => {
            onArchive();
          }}
        >
          <Archive className="size-4" aria-hidden />
          Archive
        </ContextMenuItem>
        <ContextMenuItem
          variant="destructive"
          onSelect={() => {
            onDeletePermanently();
          }}
        >
          <Trash2 className="size-4" aria-hidden />
          Delete permanently
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
