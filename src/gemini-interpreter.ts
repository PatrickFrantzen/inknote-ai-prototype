import type { Stroke } from "./canvas-input";
import { parseDetectedNotes } from "./billable-data";
import type { ProviderAdapter } from "./interpretation";
import { renderNoteImage } from "./note-image";

export interface GeminiInterpreterDeps {
  /** Path of the local proxy endpoint that actually calls the Gemini API with the secret key. */
  proxyUrl?: string;
  fetchImpl?: typeof fetch;
  /** Turns the drawn strokes into a Note Image the vision model can read. Defaults to the shared Note Image renderer. */
  rasterizeStrokes?: (strokes: Stroke[]) => string;
}

export function createGeminiInterpreter(deps: GeminiInterpreterDeps = {}): ProviderAdapter {
  const proxyUrl = deps.proxyUrl ?? "/api/interpret";
  const fetchImpl = deps.fetchImpl ?? fetch;
  const rasterizeStrokes = deps.rasterizeStrokes ?? ((strokes: Stroke[]) => renderNoteImage(strokes));

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

    const data: unknown = await response.json();

    return {
      noteId: note.id,
      notes: parseDetectedNotes(data),
      createdAt: new Date().toISOString(),
    };
  };
}
