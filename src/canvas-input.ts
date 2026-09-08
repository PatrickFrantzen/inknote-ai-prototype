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

  canvas.addEventListener("pointerdown", (event) => {
    currentStroke = [{ x: event.clientX, y: event.clientY }];
    strokes.push(currentStroke);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!currentStroke) return;
    currentStroke.push({ x: event.clientX, y: event.clientY });
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
