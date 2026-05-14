"use client";

import * as React from "react";
import { FileCode, FileText, Presentation } from "lucide-react";

import {
  EXPORT_CLIP_DRAG_MIME,
  exportClipPayloadFromDataTransfer,
  type ExportClipPayload,
} from "@/lib/conversation-export-clip";
import { isExportClipDomDragActive, setExportClipDomDragActive } from "@/lib/export-clip-drag-session";
import { THREAD_DRAG_MIME } from "@/lib/chat-constants";
import { cn } from "@/lib/utils";

const MAG_SIGMA_PX = 50;
const MAG_SIGMA_DRAG_PX = 26;
/** Near-identity hover zoom when idle; clip-drag uses a stronger dock-style bulge. */
const MAG_BOOST = 0.08;
const MAG_DRAG_BOOST = 0.44;
const MAG_PRIMARY_DRAG_MULT = 1.2;
/** Stronger bulge when clip-drag cursor is physically near an orb (Gaussian σ & cap). */
const MAG_CLIP_PROXIMITY_RAMP_PX = 165;
const MAG_CLIP_SIGMA_TIGHTEN = 0.42;
const MAG_CLIP_CAP_BOOST = 0.88;
const MAG_CLIP_PRIMARY_EXTRA = 0.14;
/** Aligned with `ChatMainHeader` (`h-12`). Rail starts below header so controls (theme toggle) stay clickable. */
const DOCK_BELOW_HEADER_PX = 48;
/** Exponential smoothing for orb scale (reduces jitter from native `drag` events). */
const MAG_SMOOTH_CLIP_DRAG = 0.38;
const MAG_SMOOTH_HOVER = 0.62;
const MAG_SMOOTH_SNAP_EPS = 0.0025;
const COLLAPSE_MS_MOTION_MS = 520;
const COLLAPSE_MS_MOTION_STRONG_MS = 590;
const COLLAPSE_MS_MOTION_ULTRA_MS = 710;
const COLLAPSE_MS_REDUCED_MS = 200;
const WARP_RESTORE_HOLD_MS = 600;
const WARP_RESTORE_HOLD_STRONG_MS = 730;
const WARP_RESTORE_HOLD_ULTRA_MS = 860;

const orbBase = cn(
  "flex shrink-0 items-center justify-center rounded-2xl border shadow-sm outline-none",
  "motion-reduce:transition-none motion-safe:transition-[box-shadow,color,background-color,border-color,opacity]",
  "motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.4,0,0.2,1)]",
  "border-border/40 bg-muted/40 text-muted-foreground/90 shadow-black/12",
  "dark:bg-muted/38 dark:shadow-black/25",
);

const orbSecondary = cn(
  orbBase,
  "size-10 sm:size-11",
  "focus-visible:ring-ring motion-safe:focus-visible:ring-1 motion-safe:focus-visible:ring-offset-1 motion-safe:focus-visible:ring-offset-background dark:focus-visible:ring-offset-background",
);

function dataTransferLikelyExportClip(dt: DataTransfer | null): boolean {
  const fromOurGrip = isExportClipDomDragActive();
  if (!dt) return fromOurGrip;

  const types = Array.from(dt.types);
  if (types.includes(THREAD_DRAG_MIME)) return false;
  if (types.includes("Files")) return false;

  if (typeof dt.items !== "undefined" && dt.items) {
    for (let i = 0; i < dt.items.length; i++) {
      if (dt.items[i]?.kind === "file") return false;
    }
  }

  if (types.includes(EXPORT_CLIP_DRAG_MIME)) return true;

  if (
    types.includes("text/plain") ||
    types.includes("Text") ||
    types.some((t) => /^text\/plain(;|$)/i.test(t))
  ) {
    return true;
  }

  /* WebKit / some paths: dragstart `types` is empty briefly; clipboard payload reads still work mid-drag */
  try {
    const structured = dt.getData(EXPORT_CLIP_DRAG_MIME).trim();
    if (structured.startsWith("{") && structured.includes("excerpt")) return true;
  } catch {
    /* ignore dataTransfer access quirks */
  }
  try {
    const plain = dt.getData("text/plain").trim();
    if (plain.length > 0) return true;
  } catch {
    /* ignore */
  }

  if (typeof dt.items !== "undefined" && dt.items && dt.items.length > 0) {
    let hasStringish = false;
    for (let i = 0; i < dt.items.length; i++) {
      const it = dt.items[i];
      if (!it) continue;
      if (it.kind === "file") return false;
      if (it.kind === "string") hasStringish = true;
    }
    if (hasStringish) return true;
  }

  return fromOurGrip;
}

export type ConversationExportDockProps = {
  onPdfClip: (payload: ExportClipPayload) => void;
  pdfStagingActive?: boolean;
  exportWorkspaceActive?: boolean;
  onOpenPdfExport: () => void;
  onOpenPptxExport: () => void;
  onExportMarkdown: () => void;
};

function consumeClipboardPaste(e: React.ClipboardEvent): ExportClipPayload | null {
  const text = e.clipboardData?.getData("text/plain").trim();
  if (!text) return null;
  return { excerpt: text };
}

function gaussianBoost(distSq: number, sigmaPx: number): number {
  const s = sigmaPx;
  return Math.exp(-distSq / (2 * s * s));
}

function smoothstep01(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** 0 = far from dock orbs, 1 = on top of nearest orb (clip-drag only). */
function clipDragProximityT(
  mx: number,
  my: number,
  els: readonly (HTMLDivElement | null)[],
): number {
  let minDistSq = Infinity;
  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 && r.height < 2) continue;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = mx - cx;
    const dy = my - cy;
    minDistSq = Math.min(minDistSq, dx * dx + dy * dy);
  }
  if (!Number.isFinite(minDistSq) || minDistSq > MAG_CLIP_PROXIMITY_RAMP_PX * MAG_CLIP_PROXIMITY_RAMP_PX) {
    return 0;
  }
  const nearest = Math.sqrt(minDistSq);
  const linearT = Math.max(0, 1 - nearest / MAG_CLIP_PROXIMITY_RAMP_PX);
  return smoothstep01(linearT);
}

export const ConversationExportDock = React.memo(function ConversationExportDock({
  onPdfClip,
  pdfStagingActive = false,
  exportWorkspaceActive = false,
  onOpenPdfExport,
  onOpenPptxExport,
  onExportMarkdown,
}: ConversationExportDockProps) {
  const exportWorkspaceRef = React.useRef(exportWorkspaceActive);
  exportWorkspaceRef.current = exportWorkspaceActive;

  const [railHot, setRailHot] = React.useState(false);
  const [reduceMotion, setReduceMotion] = React.useState(false);
  const [dockMeshExit, setDockMeshExit] = React.useState(false);
  const [warpRestore, setWarpRestore] = React.useState(false);
  const [exportClipDragging, setExportClipDragging] = React.useState(false);

  const railHotRef = React.useRef(railHot);
  railHotRef.current = railHot;
  const exportClipDraggingRef = React.useRef(exportClipDragging);
  exportClipDraggingRef.current = exportClipDragging;
  const pdfStagingActiveRef = React.useRef(pdfStagingActive);
  pdfStagingActiveRef.current = pdfStagingActive;

  const dockMeshExitRef = React.useRef(false);
  const reduceMotionRef = React.useRef(false);
  const warpRestoreTimerRef = React.useRef<number | null>(null);

  dockMeshExitRef.current = dockMeshExit;
  reduceMotionRef.current = reduceMotion;

  const collapseTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const magRafRef = React.useRef<number | null>(null);
  const pendingPointerRef = React.useRef<{ x: number; y: number } | null>(null);
  const scaleElsRef = React.useRef<(HTMLDivElement | null)[]>([null, null, null]);
  const magSmoothedScalesRef = React.useRef<[number, number, number]>([1, 1, 1]);
  const clipDragSessionRef = React.useRef(false);
  const railHitZoneRef = React.useRef<HTMLDivElement | null>(null);
  const wasInRailStripDragRef = React.useRef(false);
  const clipDragProbeRafRef = React.useRef<number | null>(null);
  const pendingClipDragProbeRef = React.useRef<DragEvent | null>(null);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  React.useEffect(
    () => () => {
      if (collapseTimerRef.current != null) clearTimeout(collapseTimerRef.current);
      if (magRafRef.current != null) cancelAnimationFrame(magRafRef.current);
      if (warpRestoreTimerRef.current != null) {
        clearTimeout(warpRestoreTimerRef.current);
      }
    },
    [],
  );

  const applyPdfPayload = React.useCallback(
    (payload: ExportClipPayload | null) => {
      if (!payload) return false;
      const excerpt = payload.excerpt.trim();
      if (!excerpt) return false;
      onPdfClip({ role: payload.role, excerpt });
      return true;
    },
    [onPdfClip],
  );

  const cancelCollapse = React.useCallback(() => {
    if (collapseTimerRef.current != null) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
  }, []);

  const resetMagnification = React.useCallback(() => {
    magSmoothedScalesRef.current = [1, 1, 1];
    for (let i = 0; i < scaleElsRef.current.length; i++) {
      const el = scaleElsRef.current[i];
      if (el) {
        el.style.willChange = "";
        el.style.transform = "";
      }
    }
  }, []);

  const runDockMagnificationFromClientPoint = React.useCallback(
    (mx: number, my: number) => {
      if (reduceMotionRef.current) return;

      const clipBoost =
        clipDragSessionRef.current || exportClipDraggingRef.current;
      const els = scaleElsRef.current;
      const baseSigma = clipBoost ? MAG_SIGMA_DRAG_PX : MAG_SIGMA_PX;
      const baseCap = clipBoost ? MAG_DRAG_BOOST : MAG_BOOST;
      let sigma = baseSigma;
      let cap = baseCap;
      let primaryMult = clipBoost ? MAG_PRIMARY_DRAG_MULT : 1.04;

      if (clipBoost) {
        const proxT = clipDragProximityT(mx, my, els);
        sigma = baseSigma * (1 - MAG_CLIP_SIGMA_TIGHTEN * proxT);
        cap = baseCap * (1 + MAG_CLIP_CAP_BOOST * proxT);
        primaryMult *= 1 + MAG_CLIP_PRIMARY_EXTRA * proxT;
      }

      const nearOne = clipBoost ? 1.012 : 1.002;
      const smoothK = clipBoost ? MAG_SMOOTH_CLIP_DRAG : MAG_SMOOTH_HOVER;
      const smoothed = magSmoothedScalesRef.current;

      for (let i = 0; i < els.length; i++) {
        const el = els[i];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = mx - cx;
        const dy = my - cy;
        let b = gaussianBoost(dx * dx + dy * dy, sigma);
        if (el.dataset.dockPrimary === "1") b *= primaryMult;
        const raw = Math.min(1 + cap * b, 1 + cap);
        const target = raw <= nearOne ? 1 : raw;
        const prevS = smoothed[i] ?? 1;
        let nextS = prevS + (target - prevS) * smoothK;
        if (Math.abs(nextS - 1) < MAG_SMOOTH_SNAP_EPS) {
          nextS = 1;
        }
        smoothed[i] = nextS;

        if (nextS <= nearOne) {
          el.style.willChange = "";
          el.style.transform = "";
        } else {
          el.style.willChange = "transform";
          el.style.transformOrigin =
            clipBoost && el.dataset.dockPrimary === "1"
              ? "100% 52%"
              : "50% 55%";
          el.style.transform = `scale(${nextS.toFixed(4)})`;
        }
      }
    },
    [],
  );

  const resetMagnificationRef = React.useRef(resetMagnification);
  resetMagnificationRef.current = resetMagnification;
  const runDockMagnificationRef = React.useRef(runDockMagnificationFromClientPoint);
  runDockMagnificationRef.current = runDockMagnificationFromClientPoint;

  const getCollapseDelayMs = React.useCallback((): number => {
    if (reduceMotionRef.current) return COLLAPSE_MS_REDUCED_MS;
    if (clipDragSessionRef.current || exportClipDraggingRef.current) {
      return COLLAPSE_MS_MOTION_ULTRA_MS;
    }
    if (pdfStagingActiveRef.current || exportWorkspaceRef.current) {
      return COLLAPSE_MS_MOTION_STRONG_MS;
    }
    return COLLAPSE_MS_MOTION_MS;
  }, []);

  const scheduleCollapse = React.useCallback(() => {
    cancelCollapse();
    const delayMs = getCollapseDelayMs();
    collapseTimerRef.current = setTimeout(() => {
      collapseTimerRef.current = null;
      if (!exportWorkspaceRef.current) {
        setRailHot(false);
        setDockMeshExit(false);
      }
    }, delayMs);
  }, [cancelCollapse, getCollapseDelayMs]);

  const getWarpRestoreHoldMs = React.useCallback((): number => {
    if (clipDragSessionRef.current || exportClipDraggingRef.current) {
      return WARP_RESTORE_HOLD_ULTRA_MS;
    }
    if (pdfStagingActiveRef.current || exportWorkspaceRef.current) {
      return WARP_RESTORE_HOLD_STRONG_MS;
    }
    return WARP_RESTORE_HOLD_MS;
  }, []);

  const replayClipDockGenie = React.useCallback(() => {
    if (reduceMotionRef.current) return;

    const prevWarp = warpRestoreTimerRef.current;
    if (prevWarp != null) window.clearTimeout(prevWarp);

    setDockMeshExit(false);

    const holdMs = getWarpRestoreHoldMs();

    setWarpRestore(false);
    requestAnimationFrame(() => {
      setWarpRestore(true);

      let scheduledNum = 0;
      const scheduledUnknown = window.setTimeout(() => {
        if (warpRestoreTimerRef.current === scheduledNum) {
          warpRestoreTimerRef.current = null;
        }
        setWarpRestore(false);
      }, holdMs);
      scheduledNum = scheduledUnknown as unknown as number;

      warpRestoreTimerRef.current = scheduledNum;
    });
  }, [getWarpRestoreHoldMs]);

  const replayClipDockGenieRef = React.useRef(replayClipDockGenie);
  replayClipDockGenieRef.current = replayClipDockGenie;

  const cancelCollapseRef = React.useRef(cancelCollapse);
  cancelCollapseRef.current = cancelCollapse;
  const scheduleCollapseRef = React.useRef(scheduleCollapse);
  scheduleCollapseRef.current = scheduleCollapse;

  React.useEffect(() => {
    const onDragStart = (e: DragEvent) => {
      if (!dataTransferLikelyExportClip(e.dataTransfer)) return;
      const dockAlreadyExpanded =
        railHotRef.current || exportWorkspaceRef.current;
      clipDragSessionRef.current = true;
      cancelCollapseRef.current();
      setDockMeshExit(false);
      setRailHot(true);
      setExportClipDragging(true);
      if (!reduceMotionRef.current && dockAlreadyExpanded) {
        queueMicrotask(() => {
          replayClipDockGenieRef.current();
        });
      }
    };

    const onDragFinish = () => {
      setExportClipDragging(false);
      wasInRailStripDragRef.current = false;
      setExportClipDomDragActive(false);
      if (!clipDragSessionRef.current) return;
      clipDragSessionRef.current = false;
      resetMagnificationRef.current();
      if (!exportWorkspaceRef.current) {
        scheduleCollapseRef.current();
      }
    };

    document.addEventListener("dragstart", onDragStart);
    document.addEventListener("dragend", onDragFinish);
    document.addEventListener("drop", onDragFinish);
    return () => {
      document.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("dragend", onDragFinish);
      document.removeEventListener("drop", onDragFinish);
    };
  }, []);

  React.useEffect(() => {
    const smMq = window.matchMedia("(min-width: 640px)");

    const flushProbe = () => {
      clipDragProbeRafRef.current = null;
      const ev = pendingClipDragProbeRef.current;
      pendingClipDragProbeRef.current = null;
      if (!ev?.dataTransfer || !smMq.matches) return;
      if (!dataTransferLikelyExportClip(ev.dataTransfer)) return;

        const rail = railHitZoneRef.current;
        const pad = 48;
        let inStrip = false;
        if (rail) {
          const r = rail.getBoundingClientRect();
          inStrip =
            ev.clientX >= r.left - pad &&
            ev.clientX <= r.right + 20 &&
            ev.clientY >= r.top - pad &&
            ev.clientY <= r.bottom + pad;
        } else {
          const w =
            typeof window.innerWidth === "number" ? window.innerWidth : 0;
          const vh =
            typeof window.visualViewport?.height === "number"
              ? window.visualViewport.height
              : window.innerHeight;
          /** Match `ChatMainHeader` height — keep top-right header controls clickable. */
          const headerH = DOCK_BELOW_HEADER_PX;
          inStrip =
            w > 0 &&
            ev.clientX >= w - 168 &&
            ev.clientY >= headerH &&
            ev.clientY <= vh;
        }

      if (!inStrip) {
        wasInRailStripDragRef.current = false;
        resetMagnificationRef.current();
        return;
      }

      const wasExpanded = railHotRef.current || exportWorkspaceRef.current;
      clipDragSessionRef.current = true;
      cancelCollapseRef.current();
      setDockMeshExit(false);
      setRailHot(true);
      setExportClipDragging(true);

      if (!reduceMotionRef.current) {
        runDockMagnificationRef.current(ev.clientX, ev.clientY);
      }

      if (!wasInRailStripDragRef.current) {
        wasInRailStripDragRef.current = true;
        if (!reduceMotionRef.current && wasExpanded) {
          queueMicrotask(() => {
            replayClipDockGenieRef.current();
          });
        }
      }
    };

    const onWindowDragCapture = (e: DragEvent) => {
      pendingClipDragProbeRef.current = e;
      if (clipDragProbeRafRef.current != null) return;
      clipDragProbeRafRef.current = window.requestAnimationFrame(flushProbe);
    };

    window.addEventListener("drag", onWindowDragCapture, true);
    return () => {
      window.removeEventListener("drag", onWindowDragCapture, true);
      if (clipDragProbeRafRef.current != null) {
        cancelAnimationFrame(clipDragProbeRafRef.current);
        clipDragProbeRafRef.current = null;
      }
      pendingClipDragProbeRef.current = null;
      wasInRailStripDragRef.current = false;
    };
  }, []);

  const onRailIntentEnter = React.useCallback(() => {
    cancelCollapse();
    const resumeFromMeshExit = dockMeshExitRef.current;
    setDockMeshExit(false);
    setRailHot(true);
    if (resumeFromMeshExit && !reduceMotionRef.current) {
      setWarpRestore(true);
      const prev = warpRestoreTimerRef.current;
      if (prev != null) window.clearTimeout(prev);

      const holdMs = getWarpRestoreHoldMs();

      let scheduledNum = 0;
      const scheduledUnknown = window.setTimeout(() => {
        if (warpRestoreTimerRef.current === scheduledNum) {
          warpRestoreTimerRef.current = null;
        }
        setWarpRestore(false);
      }, holdMs);
      scheduledNum = scheduledUnknown as unknown as number;
      warpRestoreTimerRef.current = scheduledNum;
    }
  }, [cancelCollapse, getWarpRestoreHoldMs]);

  const onRailLeave = React.useCallback(() => {
    if (exportWorkspaceRef.current) return;
    if (!reduceMotionRef.current) {
      setDockMeshExit(true);
    }
    scheduleCollapse();
    resetMagnification();
  }, [scheduleCollapse, resetMagnification]);

  const onRailDragEnter = React.useCallback(
    (e: React.DragEvent) => {
      if (!dataTransferLikelyExportClip(e.dataTransfer)) return;
      const wasExpanded = railHotRef.current || exportWorkspaceRef.current;
      clipDragSessionRef.current = true;
      cancelCollapse();
      setDockMeshExit(false);
      setRailHot(true);
      setExportClipDragging(true);
      if (!reduceMotionRef.current && wasExpanded) {
        queueMicrotask(() => {
          replayClipDockGenieRef.current();
        });
      }
    },
    [cancelCollapse],
  );

  const onRailDragOver = React.useCallback(
    (e: React.DragEvent) => {
      const dt = e.dataTransfer;
      if (!dataTransferLikelyExportClip(dt)) return;
      clipDragSessionRef.current = true;
      e.preventDefault();
      dt.dropEffect = "copy";
      cancelCollapse();
      setDockMeshExit(false);
      setRailHot(true);
      setExportClipDragging(true);
      if (!reduceMotionRef.current) {
        runDockMagnificationRef.current(e.clientX, e.clientY);
      }
    },
    [cancelCollapse],
  );

  const stackOpen = exportWorkspaceActive || railHot;
  const pdfReady = stackOpen && pdfStagingActive;
  const genieAmplify =
    exportClipDragging || pdfStagingActive || exportWorkspaceActive;
  const dockMeshUltra = exportClipDragging;
  const dockMeshStrong = !dockMeshUltra && genieAmplify;

  const prevStackOpenRef = React.useRef(false);

  React.useEffect(() => {
    const prev = prevStackOpenRef.current;
    const opening = !prev && stackOpen;
    prevStackOpenRef.current = stackOpen;

    if (!opening || reduceMotion) {
      return;
    }

    setWarpRestore(true);

    const prevWarp = warpRestoreTimerRef.current;
    if (prevWarp != null) window.clearTimeout(prevWarp);

    const holdMs = getWarpRestoreHoldMs();

    let scheduledNum = 0;
    const scheduledUnknown = window.setTimeout(() => {
      if (warpRestoreTimerRef.current === scheduledNum) {
        warpRestoreTimerRef.current = null;
      }
      setWarpRestore(false);
    }, holdMs);
    scheduledNum = scheduledUnknown as unknown as number;

    warpRestoreTimerRef.current = scheduledNum;

    return () => {
      window.clearTimeout(scheduledUnknown);
      if (warpRestoreTimerRef.current === scheduledNum) {
        warpRestoreTimerRef.current = null;
      }
    };
  }, [stackOpen, reduceMotion, getWarpRestoreHoldMs]);

  React.useEffect(() => {
    if (stackOpen) return;
    setWarpRestore(false);
    const tid = warpRestoreTimerRef.current;
    if (tid != null) window.clearTimeout(tid);
    warpRestoreTimerRef.current = null;
  }, [stackOpen]);

  const onMagPointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (reduceMotion) return;
      pendingPointerRef.current = { x: e.clientX, y: e.clientY };
      if (magRafRef.current != null) return;
      magRafRef.current = requestAnimationFrame(() => {
        magRafRef.current = null;
        const pts = pendingPointerRef.current;
        pendingPointerRef.current = null;
        if (!pts) return;
        runDockMagnificationFromClientPoint(pts.x, pts.y);
      });
    },
    [reduceMotion, runDockMagnificationFromClientPoint],
  );

  const onMagPointerLeave = React.useCallback(() => {
    resetMagnification();
  }, [resetMagnification]);

  const setScaler = React.useCallback((i: number) => {
    return (el: HTMLDivElement | null) => {
      scaleElsRef.current[i] = el;
    };
  }, []);

  const onPdfOrbClick = React.useCallback(() => {
    onOpenPdfExport();
  }, [onOpenPdfExport]);

  const onPdfOrbKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpenPdfExport();
      }
    },
    [onOpenPdfExport],
  );

  const onDragEnterPdf = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const onDragOverPdf = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDropPdf = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const payload = exportClipPayloadFromDataTransfer(e.dataTransfer);
      applyPdfPayload(payload);
    },
    [applyPdfPayload],
  );

  const onPastePdf = React.useCallback(
    (e: React.ClipboardEvent) => {
      const payload = consumeClipboardPaste(e);
      if (!payload?.excerpt) return;
      e.preventDefault();
      applyPdfPayload(payload);
    },
    [applyPdfPayload],
  );

  return (
    <div
      ref={railHitZoneRef}
      className={cn(
        "pointer-events-auto fixed right-0 z-[56] hidden sm:flex max-h-[min(22rem,calc(100dvh-6rem))] w-[min(7rem,11vw)] flex-row items-center justify-end pr-2 sm:w-[clamp(7rem,11vw,8.75rem)] sm:pr-3",
        /** Vertically center in the area below `ChatMainHeader` (`h-12` = 3rem). */
        "top-[calc((100dvh+3rem)/2)] -translate-y-1/2",
      )}
      onMouseEnter={onRailIntentEnter}
      onMouseLeave={onRailLeave}
      onTouchStart={() => void onRailIntentEnter()}
      onDragEnter={onRailDragEnter}
      onDragOver={onRailDragOver}
    >
        <div
          className={cn(
            "relative min-h-[12.5rem] w-[4.875rem] max-w-none px-2 py-3 sm:min-h-[12.75rem] sm:w-[5.125rem]",
          )}
        >
          <div
            className={cn(
              "absolute inset-0 flex flex-col items-end justify-center gap-4 pr-1.5",
              "motion-reduce:transition-none",
              dockMeshExit && !reduceMotion
                ? dockMeshUltra
                  ? "pointer-events-none motion-safe:animate-dock-dots-follow-ultra"
                  : dockMeshStrong
                    ? "pointer-events-none motion-safe:animate-dock-dots-follow-strong"
                    : "pointer-events-none motion-safe:animate-dock-dots-follow"
                : stackOpen
                  ? "pointer-events-none opacity-0 motion-safe:transition-opacity motion-safe:duration-[280ms] motion-safe:ease-[cubic-bezier(0.5,0,1,1)]"
                  : "pointer-events-none opacity-[0.9] motion-safe:transition-opacity motion-safe:duration-[280ms] motion-safe:ease-[cubic-bezier(0.25,1,0.3,1)]",
            )}
            aria-hidden={stackOpen && !dockMeshExit}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-[5px] shrink-0 rounded-full bg-muted-foreground/40 ring-[0.5px] ring-black/[0.04] shadow-[0_1px_2px_-1px_rgba(0,0,0,0.07)] dark:bg-muted-foreground/34 dark:ring-white/[0.06]"
              />
            ))}
            <span className="sr-only">
              Move the cursor to this edge for export shortcuts
            </span>
          </div>

          <div
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center pb-2 pt-1",
              "motion-reduce:transition-none",
              stackOpen
                ? "pointer-events-auto opacity-100 motion-safe:transition-opacity motion-safe:duration-[280ms] motion-safe:ease-[cubic-bezier(0.28,1,0.38,1)]"
                : "pointer-events-none opacity-0 motion-safe:transition-none motion-reduce:opacity-0",
            )}
            onPointerMove={
              stackOpen && !reduceMotion ? onMagPointerMove : undefined
            }
            onPointerLeave={
              stackOpen && !reduceMotion ? onMagPointerLeave : undefined
            }
            onLostPointerCapture={stackOpen ? onMagPointerLeave : undefined}
            aria-hidden={!stackOpen}
          >
            <div
              className={cn(
                "flex h-full min-h-[10.75rem] w-full items-center justify-center sm:min-h-[11rem]",
                dockMeshUltra
                  ? "[perspective:620px]"
                  : dockMeshStrong
                    ? "[perspective:760px]"
                    : "[perspective:900px]",
              )}
            >
              <div
                className={cn(
                  "dock-stack-warp flex h-full max-h-none w-full max-w-none flex-col items-center justify-center py-px",
                  exportClipDragging ? "gap-y-2 sm:gap-y-2" : "gap-y-1 sm:gap-y-1.5",
                  dockMeshExit &&
                    !reduceMotion &&
                    (dockMeshUltra
                      ? "motion-safe:animate-dock-stack-collapse-ultra"
                      : dockMeshStrong
                        ? "motion-safe:animate-dock-stack-collapse-strong"
                        : "motion-safe:animate-dock-stack-collapse"),
                  warpRestore &&
                    !dockMeshExit &&
                    stackOpen &&
                    !reduceMotion &&
                    (dockMeshUltra
                      ? "motion-safe:animate-dock-stack-restore-ultra"
                      : dockMeshStrong
                        ? "motion-safe:animate-dock-stack-restore-strong"
                        : "motion-safe:animate-dock-stack-restore"),
                )}
              >
                <div
                  className={cn(
                    "flex w-full shrink-0 items-center justify-center px-px",
                    exportClipDragging ? "max-w-[5.25rem] py-2 sm:py-2" : "max-w-[4.5rem] py-[5px] sm:py-1.5",
                  )}
                >
                  <div ref={setScaler(0)} data-dock-primary="1">
                    <div
                      role="button"
                      tabIndex={stackOpen ? 0 : -1}
                      aria-label={
                        pdfStagingActive
                          ? "PDF export — drop or paste adds text to the Pending clips buffer; drag clips onto preview gaps or use Add to end."
                          : "PDF export — click to configure; drop or paste queues text under Pending clips so you choose gaps in the export window."
                      }
                      aria-hidden={!stackOpen}
                      onClick={onPdfOrbClick}
                      onKeyDown={onPdfOrbKeyDown}
                      onDragEnter={onDragEnterPdf}
                      onDragOver={onDragOverPdf}
                      onDrop={onDropPdf}
                      onPaste={onPastePdf}
                      className={cn(
                        orbBase,
                        "cursor-pointer touch-manipulation select-none",
                        "aspect-square shrink-0 outline-none motion-safe:focus-visible:-translate-x-px",
                        "motion-safe:transition-[width,height,max-width,max-height,min-width,min-height] motion-safe:duration-200",
                        exportClipDragging ? "max-h-14 max-w-14 size-14" : "max-h-12 max-w-12 size-12",
                        pdfReady &&
                          "border-primary/12 bg-muted/54 text-foreground/88 opacity-[0.94]",
                        "focus-visible:ring-ring focus-visible:border-ring motion-safe:focus-visible:ring-1 motion-safe:focus-visible:ring-offset-1 motion-safe:focus-visible:ring-offset-background dark:focus-visible:ring-offset-background",
                      )}
                    >
                      <FileText
                        className={cn(
                          "pointer-events-none shrink-0 opacity-95",
                          exportClipDragging
                            ? "size-[1.12rem] sm:size-[1.2rem]"
                            : "size-[1rem] sm:size-[1.05rem]",
                        )}
                        strokeWidth={1.65}
                        aria-hidden
                      />
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    "flex w-full shrink-0 items-center justify-center px-px",
                    exportClipDragging ? "max-w-[4.875rem] py-2 sm:py-2" : "max-w-[4rem] py-[5px] sm:py-1.5",
                  )}
                >
                  <div ref={setScaler(1)}>
                    <button
                      type="button"
                      tabIndex={stackOpen ? 0 : -1}
                      aria-hidden={!stackOpen}
                      onClick={onOpenPptxExport}
                      title="Export to PowerPoint"
                      aria-label="Export conversation to PowerPoint"
                      className={cn(
                        orbSecondary,
                        exportClipDragging
                          ? "!size-12 !max-h-12 !max-w-12 sm:!size-[3.25rem] sm:!max-h-[3.25rem] sm:!max-w-[3.25rem]"
                          : null,
                        "aspect-square cursor-pointer touch-manipulation text-muted-foreground/90",
                        "motion-safe:transition-[width,height,max-width,max-height,min-width,min-height] motion-safe:duration-200",
                      )}
                    >
                      <Presentation
                        className={cn(
                          "pointer-events-none shrink-0",
                          exportClipDragging
                            ? "size-[1.05rem] sm:size-[1.12rem]"
                            : "size-[0.94rem] sm:size-[1rem]",
                        )}
                        strokeWidth={1.65}
                        aria-hidden
                      />
                    </button>
                  </div>
                </div>

                <div
                  className={cn(
                    "flex w-full shrink-0 items-center justify-center px-px",
                    exportClipDragging ? "max-w-[4.875rem] py-2 sm:py-2" : "max-w-[4rem] py-[5px] sm:py-1.5",
                  )}
                >
                  <div ref={setScaler(2)}>
                    <button
                      type="button"
                      tabIndex={stackOpen ? 0 : -1}
                      aria-hidden={!stackOpen}
                      onClick={onExportMarkdown}
                      title="Download Markdown"
                      aria-label="Download conversation as Markdown"
                      className={cn(
                        orbSecondary,
                        exportClipDragging
                          ? "!size-12 !max-h-12 !max-w-12 sm:!size-[3.25rem] sm:!max-h-[3.25rem] sm:!max-w-[3.25rem]"
                          : null,
                        "aspect-square cursor-pointer touch-manipulation text-muted-foreground/90",
                        "motion-safe:transition-[width,height,max-width,max-height,min-width,min-height] motion-safe:duration-200",
                      )}
                    >
                      <FileCode
                        className={cn(
                          "pointer-events-none shrink-0",
                          exportClipDragging
                            ? "size-[1.05rem] sm:size-[1.12rem]"
                            : "size-[0.94rem] sm:size-[1rem]",
                        )}
                        strokeWidth={1.65}
                        aria-hidden
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
});
