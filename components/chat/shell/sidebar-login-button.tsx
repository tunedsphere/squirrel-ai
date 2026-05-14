"use client";

import { DoorOpen } from "lucide-react";
import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function SidebarLoginButton() {
  const { state, isMobile } = useSidebar();
  const collapsed = !isMobile && state === "collapsed";

  const loginClasses =
    "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:hover:bg-sidebar-accent/80";

  return (
    <>
      <Show when="signed-out">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" asChild className={cn("size-8 shrink-0", loginClasses)}>
                <Link href="/sign-in" aria-label="Log in">
                  <DoorOpen className="size-4 opacity-80" aria-hidden />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" hidden={state !== "collapsed" || isMobile}>
              Log in
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button variant="ghost" asChild className={cn(
              "h-9 w-full justify-start gap-2 px-2 py-6 font-normal rounded-2xl",
              loginClasses,
            )}>
            <Link href="/sign-in">
              <DoorOpen className="size-6 shrink-0 opacity-70 mr-1.5" aria-hidden />
              Log in
            </Link>
          </Button>
        )}
      </Show>
      <Show when="signed-in">
        <div
          className={cn(
            "flex w-full items-center",
            collapsed ? "justify-center" : "justify-start px-1",
          )}
        >
          <UserButton
            appearance={{
              elements: {
                avatarBox: collapsed ? "size-8" : "size-9",
              },
            }}
          />
        </div>
      </Show>
    </>
  );
}
