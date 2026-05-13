"use client"

import { DoorOpen } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function SidebarLoginButton() {
  const { state, isMobile } = useSidebar()
  const collapsed = !isMobile && state === "collapsed"

  const loginClasses =
    "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:hover:bg-sidebar-accent/80"

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Log in"
            className={cn("size-8 shrink-0", loginClasses)}
          >
            <DoorOpen className="size-4 opacity-80" aria-hidden />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" hidden={state !== "collapsed" || isMobile}>
          Log in
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "h-9 w-full justify-start gap-2 px-2 py-6 font-normal rounded-2xl",
        loginClasses,
      )}
    >
      <DoorOpen className="size-6 shrink-0 opacity-70 mr-1.5" aria-hidden />
      Log in
    </Button>
  )
}
