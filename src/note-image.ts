import type { Stroke } from "./canvas-input";

const NOTE_IMAGE_WIDTH = 800;
const NOTE_IMAGE_HEIGHT = 320;

export type CanvasFactory = () => HTMLCanvasElement;

const defaultCanvasFactory: CanvasFactory = () => document.createElement("canvas");

/** Renders Stroke Data to a Note Image (PNG data URL), the shared basis for Provider input and review previews. */
export function renderNoteImage(strokes: Stroke[], createCanvas: CanvasFactory = defaultCanvasFactory): string {
  const canvas = createCanvas();
  canvas.width = NOTE_IMAGE_WIDTH;
  canvas.height = NOTE_IMAGE_HEIGHT;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.lineWidth = 2;
  context.lineCap = "round";
  context.strokeStyle = "#000000";
  for (const stroke of strokes) {
    const [first, ...rest] = stroke;
    if (!first) continue;
    context.beginPath();
    context.moveTo(first.x, first.y);
    for (const point of rest) {
      context.lineTo(point.x, point.y);
    }
    context.stroke();
  }
  return canvas.toDataURL("image/png");
}
