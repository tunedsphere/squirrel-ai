"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const HIDE_SCROLLBAR =
  "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

/**
 * Matches `bg-muted/40`-style washes on popover (e.g. export preset panels): muted layered on dialog surface.
 */
const MUTED_ON_POPOVER =
  "color-mix(in_oklch,var(--muted)_40%,var(--popover))";

/** Short, soft vertical edge masks in `ExportScrollFadeY`. Horizontal strip lateral tint = `fadeXLateralTint`. */
const fades = {
  popover: {
    left:
      "bg-[linear-gradient(90deg,var(--popover)_0%,color-mix(in_oklch,var(--popover)_72%,transparent)_18%,color-mix(in_oklch,var(--popover)_42%,transparent)_40%,color-mix(in_oklch,var(--popover)_16%,transparent)_70%,transparent_100%)]",
    right:
      "bg-[linear-gradient(270deg,var(--popover)_0%,color-mix(in_oklch,var(--popover)_72%,transparent)_18%,color-mix(in_oklch,var(--popover)_42%,transparent)_40%,color-mix(in_oklch,var(--popover)_16%,transparent)_70%,transparent_100%)]",
    top: "bg-[linear-gradient(180deg,var(--popover)_0%,color-mix(in_oklch,var(--popover)_40%,transparent)_50%,transparent_100%)]",
    bottom:
      "bg-[linear-gradient(0deg,var(--popover)_0%,color-mix(in_oklch,var(--popover)_40%,transparent)_50%,transparent_100%)]",
  },
  muted: {
    left: `bg-[linear-gradient(90deg,${MUTED_ON_POPOVER}_0%,color-mix(in_oklch,${MUTED_ON_POPOVER}_76%,transparent)_16%,color-mix(in_oklch,${MUTED_ON_POPOVER}_48%,transparent)_36%,color-mix(in_oklch,${MUTED_ON_POPOVER}_22%,transparent)_62%,transparent_100%)]`,
    right: `bg-[linear-gradient(270deg,${MUTED_ON_POPOVER}_0%,color-mix(in_oklch,${MUTED_ON_POPOVER}_76%,transparent)_16%,color-mix(in_oklch,${MUTED_ON_POPOVER}_48%,transparent)_36%,color-mix(in_oklch,${MUTED_ON_POPOVER}_22%,transparent)_62%,transparent_100%)]`,
    top: `bg-[linear-gradient(180deg,${MUTED_ON_POPOVER}_0%,color-mix(in_oklch,${MUTED_ON_POPOVER}_38%,transparent)_50%,transparent_100%)]`,
    bottom:
      `bg-[linear-gradient(0deg,${MUTED_ON_POPOVER}_0%,color-mix(in_oklch,${MUTED_ON_POPOVER}_38%,transparent)_50%,transparent_100%)]`,
  },
} as const;

export type ExportOverflowFadeTone = keyof typeof fades;

/** Narrow vertical edge hint height. */
const FADE_Y_H = "h-4 sm:h-[1.125rem]";

/** Horizontal overflow edge width — gradual tint-only fade (`fadeXLateralTint`). */
const FADE_X_LATERAL_W = "w-9 sm:w-11";

/** Lateral overlays: tinted gradient only (no backdrop-filter → no milky whitening). Uses `fades[*].left|right`. */
function fadeXLateralTint(
  toneKey: ExportOverflowFadeTone,
  side: "left" | "right",
): string {
  const maskSoft =
    side === "left"
      ? "[mask-image:linear-gradient(to_right,black_6%,transparent_97%)] [mask-repeat:no-repeat] [-webkit-mask-image:linear-gradient(to_right,black_6%,transparent_97%)]"
      : "[mask-image:linear-gradient(to_left,black_6%,transparent_97%)] [mask-repeat:no-repeat] [-webkit-mask-image:linear-gradient(to_left,black_6%,transparent_97%)]";

  const grad = fades[toneKey][side];
  return cn(FADE_X_LATERAL_W, grad, maskSoft);
}

export type ExportScrollNavOverlap = {
  left: string;
  right: string;
};

export type ExportScrollFadeXProps = {
  tone: ExportOverflowFadeTone;
  children: React.ReactNode;
  className?: string;
  scrollerClassName?: string;
  navOverlap?: Partial<ExportScrollNavOverlap>;
  "aria-label"?: string;
};

const DEFAULT_NAV_OVERLAP: ExportScrollNavOverlap = {
  left: "pl-8",
  right: "pr-8",
};

/** Vertical scroll area: hidden scrollbars + soft edge hints when overflow. */
export function ExportScrollFadeY({
  tone,
  children,
  className,
  scrollerClassName,
  id,
  role,
  "aria-labelledby": ariaLabelledby,
}: {
  tone: ExportOverflowFadeTone;
  children: React.ReactNode;
  className?: string;
  scrollerClassName?: string;
  id?: string;
  role?: React.HTMLAttributes<HTMLDivElement>["role"];
  "aria-labelledby"?: string;
}) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const [fadeTop, setFadeTop] = React.useState(false);
  const [fadeBottom, setFadeBottom] = React.useState(false);
  const t = fades[tone];

  const update = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const maxScroll = scrollHeight - clientHeight;
    const eps = 2;
    if (maxScroll <= eps) {
      setFadeTop(false);
      setFadeBottom(false);
      return;
    }
    setFadeTop(scrollTop > eps);
    setFadeBottom(scrollTop < maxScroll - eps);
  }, []);

  React.useLayoutEffect(() => {
    update();
  }, [children, update]);

  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, [update]);

  return (
    <div
      id={id}
      role={role}
      aria-labelledby={ariaLabelledby}
      className={cn(
        "relative isolate flex min-h-0 flex-col overflow-hidden",
        className,
      )}
    >
      <div
        aria-hidden={!fadeTop}
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-10 transition-opacity duration-200",
          FADE_Y_H,
          t.top,
          fadeTop ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        aria-hidden={!fadeBottom}
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-10 transition-opacity duration-200",
          FADE_Y_H,
          t.bottom,
          fadeBottom ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        ref={scrollerRef}
        onScroll={update}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-y-contain",
          HIDE_SCROLLBAR,
          scrollerClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Horizontal strip: hidden scrollbars, gentle edge fades, touch + wheel + nudge buttons. */
export function ExportScrollFadeX({
  tone,
  children,
  className,
  scrollerClassName,
  navOverlap,
  "aria-label": ariaLabel,
}: ExportScrollFadeXProps) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const [fadeLeft, setFadeLeft] = React.useState(false);
  const [fadeRight, setFadeRight] = React.useState(false);
  const [navShownLeft, setNavShownLeft] = React.useState(false);
  const [navShownRight, setNavShownRight] = React.useState(false);

  const update = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = Math.max(0, scrollWidth - clientWidth);

    /** Allow subpixel/layout slack so we don't show "false" overflows. */
    const overflowEpsilon = 1;
    if (maxScroll <= overflowEpsilon) {
      setFadeLeft(false);
      setFadeRight(false);
      setNavShownLeft(false);
      setNavShownRight(false);
      return;
    }

    const rawSl = Math.max(
      0,
      Number.isFinite(scrollLeft)
        ? Math.min(scrollLeft, maxScroll + 1)
        : 0,
    );
    const ms = maxScroll;

    /** Edge fades — small threshold */
    const hintEpsilon = Math.max(3, overflowEpsilon);

    /** Slack for subpixel snap / fractional layout (scrollLeft can disagree with visuals). */
    const edgeSlackPx = Math.max(
      6,
      Math.min(22, Math.floor(clientWidth * 0.035)),
    );

    /** Whether the first horizontal child still meets the viewport's left inner edge — source of truth vs scrollLeft alone. */
    let atScrollStart = rawSl <= edgeSlackPx;
    let atScrollEnd = rawSl >= ms - edgeSlackPx;
    try {
      const row = el.firstElementChild as HTMLElement | null;
      if (
        row &&
        row.firstElementChild &&
        row.lastElementChild &&
        row.childElementCount > 0
      ) {
        const first = row.firstElementChild as HTMLElement;
        const last = row.lastElementChild as HTMLElement;
        const vb = el.getBoundingClientRect();
        const vx0 = vb.left + el.clientLeft;
        /** Inner scrollport clip (clientWidth aligns with horizontal overflow area). */
        const vx1 = vx0 + el.clientWidth;
        const ix0 = first.getBoundingClientRect().left;
        atScrollStart = ix0 >= vx0 - edgeSlackPx;

        const ix1 = last.getBoundingClientRect().right;
        atScrollEnd = ix1 <= vx1 + edgeSlackPx;
      }
    } catch {
      /** keep scrollLeft-derived flags */
    }

    /** Overflow big enough before showing nav affordances (avoids jitter on trivial overflow). */
    const scrollPadGate = edgeSlackPx + 26;
    const navEligible =
      ms > scrollPadGate + Math.floor(clientWidth * 0.085);

    /** Left/right fades follow visual edges; hint epsilon avoids flicker at exact extremes. */
    setFadeLeft(!atScrollStart && rawSl > hintEpsilon + 1e-2);
    setFadeRight(!atScrollEnd && rawSl < ms - hintEpsilon - 1e-2);

    const showBackBtn = navEligible && !atScrollStart;
    const showFwdBtn = navEligible && !atScrollEnd;

    setNavShownLeft(showBackBtn);
    setNavShownRight(showFwdBtn);
  }, []);

  const scrollPage = React.useCallback((direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const delta = Math.max(120, el.clientWidth * 0.72);
    el.scrollBy({ left: direction * delta, behavior: "smooth" });
  }, []);

  React.useLayoutEffect(() => {
    update();
    const id = requestAnimationFrame(() => {
      update();
    });
    return () => cancelAnimationFrame(id);
  }, [children, update]);

  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, [update]);

  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScrollEnd = () => update();
    el.addEventListener("scrollend", onScrollEnd);
    return () => el.removeEventListener("scrollend", onScrollEnd);
  }, [update]);
  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth + 2) return;
      const dx = Math.abs(e.deltaX);
      const dy = Math.abs(e.deltaY);

      if (e.shiftKey) {
        e.preventDefault();
        el.scrollLeft += e.deltaY + e.deltaX;
        return;
      }
      if (dx > dy && dx > 2) return;
      if (dy < 3) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [children]);

  const navSurface =
    tone === "muted"
      ? `border-border/40 bg-[color-mix(in_oklch,${MUTED_ON_POPOVER}_80%,transparent)] text-muted-foreground shadow-sm backdrop-blur-sm supports-backdrop-filter:bg-[color-mix(in_oklch,${MUTED_ON_POPOVER}_58%,transparent)]`
      : "border-border/50 bg-popover/90 text-muted-foreground shadow-sm backdrop-blur-sm supports-backdrop-filter:bg-popover/68";

  const navLabelStem = ariaLabel?.trim().length ? ariaLabel : "This strip";

  const overlapRight = navOverlap?.right ?? DEFAULT_NAV_OVERLAP.right;

  return (
    <div className={cn("relative min-w-0", className)}>
      <div
        ref={scrollerRef}
        onScroll={update}
        aria-label={ariaLabel}
        role={ariaLabel ? "group" : undefined}
        className={cn(
          "relative z-0 touch-pan-x overflow-x-auto overflow-y-hidden overscroll-x-contain [-webkit-overflow-scrolling:touch]",
          HIDE_SCROLLBAR,
          navShownRight ? overlapRight : "",
          scrollerClassName,
        )}
        dir="ltr"
      >
        {children}
      </div>
      <div
        aria-hidden={!fadeLeft}
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 z-[8] transition-opacity duration-200",
          fadeXLateralTint(tone, "left"),
          fadeLeft ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        aria-hidden={!fadeRight}
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 z-[8] transition-opacity duration-200",
          fadeXLateralTint(tone, "right"),
          fadeRight ? "opacity-100" : "opacity-0",
        )}
      />

      {navShownLeft ? (
        <div className="absolute top-1/2 left-0.5 z-[25] -translate-y-1/2 sm:left-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => scrollPage(-1)}
            aria-label={`${navLabelStem}: scroll backward`}
            className={cn("size-6 rounded-full border sm:size-7", navSurface)}
          >
            <ChevronLeft className="size-3.5 sm:size-4" aria-hidden strokeWidth={1.75} />
          </Button>
        </div>
      ) : null}
      {navShownRight ? (
        <div className="absolute top-1/2 right-0.5 z-[25] -translate-y-1/2 sm:right-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => scrollPage(1)}
            aria-label={`${navLabelStem}: scroll forward`}
            className={cn("size-6 rounded-full border sm:size-7", navSurface)}
          >
            <ChevronRight className="size-3.5 sm:size-4" aria-hidden strokeWidth={1.75} />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
