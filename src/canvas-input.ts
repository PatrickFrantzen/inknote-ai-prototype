export interface Point {
  x: number;
  y: number;
}

export type Stroke = Point[];

export interface CanvasInputController {
  getStrokes(): Stroke[];
  clear(): void;
}

export function attachCanvasInput(canvas: HTMLCanvasElement): CanvasInputController {
  const strokes: Stroke[] = [];
  let currentStroke: Stroke | null = null;

  function toCanvasPoint(event: MouseEvent): Point {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  canvas.addEventListener("pointerdown", (event) => {
    currentStroke = [toCanvasPoint(event)];
    strokes.push(currentStroke);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!currentStroke) return;
    currentStroke.push(toCanvasPoint(event));
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
  };
}
