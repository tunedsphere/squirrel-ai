"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type ComposerActionsScrollRowProps = {
  children: React.ReactNode;
  className?: string;
};

/** Horizontal row of actions with soft edge fades when content overflows (scroll horizontally). */
export function ComposerActionsScrollRow({
  children,
  className,
}: ComposerActionsScrollRowProps) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const [fadeLeft, setFadeLeft] = React.useState(false);
  const [fadeRight, setFadeRight] = React.useState(false);

  const updateFades = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;
    const epsilon = 2;
    if (maxScroll <= epsilon) {
      setFadeLeft(false);
      setFadeRight(false);
      return;
    }
    setFadeLeft(scrollLeft > epsilon);
    setFadeRight(scrollLeft < maxScroll - epsilon);
  }, []);

  React.useLayoutEffect(() => {
    updateFades();
  }, [children, updateFades]);

  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      updateFades();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateFades]);

  return (
    <div
      className={cn("relative isolate", className)}
      role="toolbar"
      aria-label="Conversation actions"
    >
      <div
        aria-hidden={!fadeLeft}
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 z-10 w-10 rounded-l-[inherit]",
          "bg-gradient-to-r from-background via-background/85 to-transparent",
          "transition-opacity duration-150",
          fadeLeft ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        aria-hidden={!fadeRight}
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 z-10 w-10 rounded-r-[inherit]",
          "bg-gradient-to-l from-background via-background/85 to-transparent",
          "transition-opacity duration-150",
          fadeRight ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        ref={scrollerRef}
        onScroll={updateFades}
        className={cn(
          "flex min-h-[2.5rem] items-center gap-2 overflow-x-auto overflow-y-hidden px-1 py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        {children}
      </div>
    </div>
  );
}
