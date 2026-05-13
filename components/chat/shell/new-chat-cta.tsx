"use client"

import { MessageSquarePlus } from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useSidebar } from "@/components/ui/sidebar"

const newChatGlassExpanded =
  "glass-liquid flex h-9 w-full cursor-pointer select-none items-center justify-center px-3 py-2 text-sm font-semibold text-primary shadow-none !transition-[border-color,box-shadow,background,backdrop-filter,-webkit-backdrop-filter] duration-200 hover:!translate-y-0 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"

const newChatGlassCollapsed =
  "glass-subtle flex size-8 shrink-0 cursor-pointer select-none items-center justify-center rounded-md p-0 text-primary shadow-none !transition-[border-color,box-shadow,background] duration-200 hover:!translate-y-0 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4"

export function NewChatCta({ onClick }: { onClick: () => void }) {
  const { state, isMobile } = useSidebar()
  const collapsed = !isMobile && state === "collapsed"

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            aria-label="New chat"
            data-new-chat-cta
            className={newChatGlassCollapsed}
          >
            <MessageSquarePlus aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">New chat</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      data-new-chat-cta
      className={newChatGlassExpanded}
    >
      <span className="relative z-10 select-none">New Chat</span>
    </button>
  )
}
