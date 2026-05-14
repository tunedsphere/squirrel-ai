"use client";

import * as React from "react";
import { Group, Panel, Separator } from "react-resizable-panels";

import { cn } from "@/lib/utils";

const ResizablePanelGroup = Group;
const ResizablePanel = Panel;

/** Thin splitter: no grip icon; wide invisible hit strip; hover/focus reinforce affordance. */
function ResizableHandle({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      className={cn(
        "relative shrink-0 bg-border/55 transition-[background-color,box-shadow] duration-150 ease-out",
        "w-px data-[orientation=vertical]:h-px data-[orientation=vertical]:w-full",
        "hover:bg-primary/42 hover:shadow-[inset_0_0_0_1px] hover:shadow-primary/25",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/90 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "active:bg-primary/48",
        /* Wider drag target; keeps visible stroke at 1 logical px */
        "after:pointer-events-none after:absolute after:z-10 after:bg-transparent after:content-['']",
        "after:inset-y-0 after:left-1/2 after:w-3 after:-translate-x-1/2",
        "data-[orientation=vertical]:after:inset-x-0 data-[orientation=vertical]:after:inset-y-0",
        "data-[orientation=vertical]:after:h-3 data-[orientation=vertical]:after:w-full",
        "data-[orientation=vertical]:after:translate-x-0 data-[orientation=vertical]:after:translate-y-1/2",
        className,
      )}
      {...props}
    >
      {children}
    </Separator>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
