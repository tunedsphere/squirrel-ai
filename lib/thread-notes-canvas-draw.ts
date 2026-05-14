import type { NotesCanvasStroke, ThreadNotesCanvasState } from "@/lib/thread-notes-types"

function denorm(
  p: { x: number; y: number },
  w: number,
  h: number,
): { x: number; y: number } {
  return { x: p.x * w, y: p.y * h }
}

export function drawThreadNotesCanvasState(
  ctx: CanvasRenderingContext2D,
  state: ThreadNotesCanvasState,
  width: number,
  height: number,
) {
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, width, height)

  for (const s of state.strokes) {
    drawStroke(ctx, s, width, height)
  }
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  s: NotesCanvasStroke,
  width: number,
  height: number,
) {
  ctx.strokeStyle = s.color
  ctx.lineWidth = Math.max(1, s.lineWidth)
  ctx.lineJoin = "round"
  ctx.lineCap = "round"

  const pts = s.points.map((p) => denorm(p, width, height))

  if (s.tool === "pencil") {
    if (pts.length < 2) return
    ctx.beginPath()
    ctx.moveTo(pts[0]!.x, pts[0]!.y)
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i]!.x, pts[i]!.y)
    }
    ctx.stroke()
    return
  }

  if (pts.length < 2) return
  const a = pts[0]!
  const b = pts[pts.length - 1]!

  if (s.tool === "rect") {
    ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y)
    return
  }

  if (s.tool === "line") {
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }
}

export function threadNotesCanvasToDataUrl(
  state: ThreadNotesCanvasState,
  width: number,
  height: number,
): string {
  const c = document.createElement("canvas")
  c.width = width
  c.height = height
  const ctx = c.getContext("2d")
  if (!ctx) return ""
  drawThreadNotesCanvasState(ctx, state, width, height)
  return c.toDataURL("image/png")
}
