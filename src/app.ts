import type { Stroke } from "./canvas-input";
import type { Interpreter, InternalDocumentEntry } from "./interpretation";
import { interpretNote } from "./interpretation";
import type { RawNote } from "./note-store";
import { loadLatestNote, saveNote } from "./note-store";

export function saveDrawnNote(strokes: Stroke[]): RawNote {
  const note: RawNote = {
    id: crypto.randomUUID(),
    content: JSON.stringify(strokes),
    createdAt: new Date().toISOString(),
  };

  saveNote(note);
  return note;
}

export async function interpretLatestNote(interpreter: Interpreter): Promise<InternalDocumentEntry | null> {
  const note = loadLatestNote();
  return note ? interpretNote(note, interpreter) : null;
}
