export interface Point {
  x: number;
  y: number;
}

export type Stroke = Point[];

export type CanvasTool = "pen" | "eraser";

export interface CanvasInputController {
  getStrokes(): Stroke[];
  clear(): void;
  undo(): void;
  setTool(tool: CanvasTool): void;
}

const ERASER_RADIUS = 12;

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function attachCanvasInput(canvas: HTMLCanvasElement): CanvasInputController {
  const strokes: Stroke[] = [];
  let currentStroke: Stroke | null = null;
  let tool: CanvasTool = "pen";

  function toCanvasPoint(event: MouseEvent): Point {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function eraseAt(point: Point) {
    const kept = strokes.filter((stroke) => !stroke.some((strokePoint) => distance(strokePoint, point) <= ERASER_RADIUS));
    strokes.length = 0;
    strokes.push(...kept);
  }

  canvas.addEventListener("pointerdown", (event) => {
    const point = toCanvasPoint(event);
    if (tool === "eraser") {
      eraseAt(point);
      return;
    }
    currentStroke = [point];
    strokes.push(currentStroke);
  });

  canvas.addEventListener("pointermove", (event) => {
    const point = toCanvasPoint(event);
    if (tool === "eraser") {
      eraseAt(point);
      return;
    }
    if (!currentStroke) return;
    currentStroke.push(point);
  });

  canvas.addEventListener("pointerup", () => {
    currentStroke = null;
  });

  return {
    getStrokes: () => strokes.map((stroke) => [...stroke]),
    clear: () => {
      strokes.length = 0;
      currentStroke = null;
    },
    undo: () => {
      strokes.pop();
      currentStroke = null;
    },
    setTool: (nextTool) => {
      tool = nextTool;
    },
  };
}
