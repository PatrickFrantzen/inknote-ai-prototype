import type { RawNote } from "./note-store";

export interface InternalDocumentEntry {
  noteId: string;
  summary: string;
  createdAt: string;
}

export type Interpreter = (note: RawNote) => InternalDocumentEntry;

export const mockInterpreter: Interpreter = (note) => ({
  noteId: note.id,
  summary: `Mock interpretation of: ${note.content}`,
  createdAt: new Date().toISOString(),
});

export function interpretNote(note: RawNote, interpreter: Interpreter): InternalDocumentEntry {
  return interpreter(note);
}
