export type NotesCanvasToolId = "pencil" | "rect" | "line"

export type NotesCanvasStroke = {
  id: string
  tool: NotesCanvasToolId
  color: string
  lineWidth: number
  /** Normalized 0..1 within the interactive canvas. */
  points: { x: number; y: number }[]
}

export type ThreadNotesCanvasState = {
  strokes: NotesCanvasStroke[]
}

export function emptyThreadNotesCanvasState(): ThreadNotesCanvasState {
  return { strokes: [] }
}
