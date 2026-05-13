"use client"

import * as React from "react"
import { Search } from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function CollapsibleSearch({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const { state, isMobile, setOpen } = useSidebar()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const pendingFocusRef = React.useRef(false)
  const collapsed = !isMobile && state === "collapsed"

  React.useEffect(() => {
    if (!collapsed && pendingFocusRef.current) {
      pendingFocusRef.current = false
      window.requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [collapsed])

  const searchRow = (
    <div
      className={cn(
        "flex min-h-8 items-center gap-2",
        collapsed
          ? "size-8 shrink-0 cursor-pointer items-center justify-center gap-0 rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          : "w-full cursor-text border-b border-border",
      )}
      onClick={() => {
        if (collapsed) {
          pendingFocusRef.current = true
          setOpen(true)
        } else {
          inputRef.current?.focus()
        }
      }}
      role="search"
      tabIndex={-1}
      aria-label={
        collapsed ? "Search your thread. Expands the sidebar." : undefined
      }
    >
      <Search
        className="pointer-events-none size-4 shrink-0 text-muted-foreground opacity-80 "
        aria-hidden
      />
      <div
        className={cn(
          "relative min-h-5 min-w-0 flex-1",
          collapsed &&
            "pointer-events-none absolute h-px w-px overflow-hidden opacity-0",
        )}
      >
        {value === "" ? (
          <span
            className="pointer-events-none absolute left-0 top-1/2 max-w-full -translate-y-1/2 truncate text-sm text-muted-foreground"
            aria-hidden
          >
            Search your thread.
          </span>
        ) : null}
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          aria-label="Search threads"
          tabIndex={collapsed ? -1 : 0}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute inset-0 box-border w-full min-w-0 appearance-none border-0 bg-transparent p-0 text-sm outline-none ring-0 focus-visible:ring-0",
            "[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:appearance-none",
            value === ""
              ? "text-transparent caret-foreground selection:bg-transparent"
              : "text-foreground",
          )}
        />
      </div>
    </div>
  )

  return (
    <div className="shrink-0">
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{searchRow}</TooltipTrigger>
          <TooltipContent side="right">Search your thread.</TooltipContent>
        </Tooltip>
      ) : (
        searchRow
      )}
    </div>
  )
}
