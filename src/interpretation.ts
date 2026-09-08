import type { RawNote } from "./note-store";

export interface InternalDocumentEntry {
  noteId: string;
  summary: string;
  createdAt: string;
}

export type Interpreter = (note: RawNote) => Promise<InternalDocumentEntry>;

export const mockInterpreter: Interpreter = async (note) => ({
  noteId: note.id,
  summary: `Mock interpretation of: ${note.content}`,
  createdAt: new Date().toISOString(),
});

export async function interpretNote(note: RawNote, interpreter: Interpreter): Promise<InternalDocumentEntry> {
  return interpreter(note);
}
