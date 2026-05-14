"use client";

import { LayoutGrid, MessageSquare, PanelLeft, Squirrel } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MainView } from "@/hooks/use-thread-workspace";
import { cn } from "@/lib/utils";

export type ChatMainHeaderProps = {
  mainView: MainView;
  setMainView: (v: MainView) => void;
};

export function ChatMainHeader({ mainView, setMainView }: ChatMainHeaderProps) {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b px-4 sm:px-6">
      <div className="min-w-0">
        {/* Mobile (<md): `@container` so title hides when Chat/Library eats space; squirrel trigger unchanged. */}
        <div className="@container flex h-full min-w-0 items-center gap-2 md:hidden">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Open sidebar"
                className="group shrink-0 hover:bg-accent hover:text-accent-foreground"
                onClick={toggleSidebar}
              >
                <span
                  aria-hidden
                  className="relative flex size-[1.125rem] shrink-0 items-center justify-center"
                >
                  <Squirrel className="size-[1.125rem] shrink-0 text-primary transition-opacity duration-150 ease-out group-hover:opacity-0" />
                  <PanelLeft className="text-muted-foreground absolute size-[1.125rem] shrink-0 opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100" />
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              Open sidebar
            </TooltipContent>
          </Tooltip>
          <span
            aria-label="Squirrel Chat"
            title="Squirrel Chat"
            className="flex min-h-7 min-w-0 flex-1 items-center overflow-hidden text-start text-sm leading-none font-semibold tracking-tight whitespace-nowrap"
          >
            <span className="@max-[148px]:sr-only">Squirrel</span>
            <span className="hidden @min-[220px]:inline">&nbsp;Chat</span>
          </span>
        </div>
      </div>
      <div className="flex justify-center">
        <div
          className="inline-flex items-center rounded-lg gap-1.5 py-1 px-2 shadow-xs"
          role="group"
          aria-label="Main view"
        >
          <button
            type="button"
            aria-label="Chat"
            aria-pressed={mainView === "chat"}
            onClick={() => setMainView("chat")}
            className={cn(
              "hover:bg-muted inline-flex items-center justify-center gap-0 rounded-md px-2 py-2 text-xs font-medium transition-colors md:gap-1.5 md:px-3 md:py-1.5 cursor-pointer",
              mainView === "chat"
                ? "bg-background text-foreground shadow-sm "
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <MessageSquare
              strokeWidth={2}
              className="size-4 shrink-0 md:size-3.5"
              aria-hidden
            />
            <span className="hidden md:inline">Chat</span>
          </button>
          <span
            className="mx-0.5 h-4 w-px shrink-0 rounded-full bg-primary/45 dark:bg-primary/55"
            aria-hidden
          />
          <button
            type="button"
            aria-label="Library"
            aria-pressed={mainView === "library"}
            onClick={() => setMainView("library")}
            className={cn(
              "hover:bg-muted inline-flex items-center justify-center gap-0 rounded-md px-2 py-2 text-xs font-medium transition-colors md:gap-1.5 md:px-3 md:py-1.5 cursor-pointer",
              mainView === "library"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutGrid
              strokeWidth={2}
              className="size-4 shrink-0 md:size-3.5"
              aria-hidden
            />
            <span className="hidden md:inline">Library</span>
          </button>
        </div>
      </div>
      <div className="flex justify-end">
        <ThemeToggle />
      </div>
    </header>
  );
}
