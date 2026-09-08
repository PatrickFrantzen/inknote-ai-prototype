import type { Stroke } from "./canvas-input";
import type { Interpreter } from "./interpretation";

export interface GeminiInterpreterDeps {
  /** Path of the local proxy endpoint that actually calls the Gemini API with the secret key. */
  proxyUrl?: string;
  fetchImpl?: typeof fetch;
  /** Turns the drawn strokes into a raster image the vision model can read. Defaults to a real <canvas> render. */
  rasterizeStrokes?: (strokes: Stroke[]) => string;
}

function defaultRasterizeStrokes(strokes: Stroke[]): string {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 320;
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

export function createGeminiInterpreter(deps: GeminiInterpreterDeps = {}): Interpreter {
  const proxyUrl = deps.proxyUrl ?? "/api/interpret";
  const fetchImpl = deps.fetchImpl ?? fetch;
  const rasterizeStrokes = deps.rasterizeStrokes ?? defaultRasterizeStrokes;

  return async (note) => {
    const strokes = JSON.parse(note.content) as Stroke[];
    const imageDataUrl = rasterizeStrokes(strokes);

    const response = await fetchImpl(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId: note.id, imageDataUrl }),
    });

    if (!response.ok) {
      throw new Error(`Interpretation request failed with status ${response.status}`);
    }

    const data = (await response.json()) as { summary: string };

    return {
      noteId: note.id,
      summary: data.summary,
      createdAt: new Date().toISOString(),
    };
  };
}
