"use client"

import { Squirrel } from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"
import {
  SidebarTrigger,
} from "@/components/ui/sidebar"
import type { MainView } from "@/hooks/use-thread-workspace"
import { cn } from "@/lib/utils"

export type ChatMainHeaderProps = {
  mainView: MainView
  setMainView: (v: MainView) => void
}

export function ChatMainHeader({ mainView, setMainView }: ChatMainHeaderProps) {
  return (
    <header className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger className="shrink-0 md:hidden" />
        <span className="flex min-w-0 items-center gap-2 font-semibold md:hidden">
          <Squirrel className="size-4 shrink-0 text-primary" aria-hidden />
          <span className="truncate">Squirrel Chat</span>
        </span>
      </div>
      <div className="flex justify-center">
        <div
          className="inline-flex items-center rounded-lg border border-border bg-muted/45 py-1 px-2 shadow-sm"
          role="group"
          aria-label="Main view"
        >
          <button
            type="button"
            onClick={() => setMainView("chat")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
              mainView === "chat"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Chat
          </button>
          <span
            className="mx-0.5 h-4 w-px shrink-0 rounded-full bg-primary/45 dark:bg-primary/55"
            aria-hidden
          />
          <button
            type="button"
            onClick={() => setMainView("library")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
              mainView === "library"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Library
          </button>
        </div>
      </div>
      <div className="flex justify-end">
        <ThemeToggle />
      </div>
    </header>
  )
}
