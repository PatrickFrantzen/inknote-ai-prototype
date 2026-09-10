import type { RawNote } from "./note-store";

export interface DetectedNote {
  heading: string;
  bullets: string[];
}

export interface InternalDocumentEntry {
  noteId: string;
  notes: DetectedNote[];
  createdAt: string;
}

/** The Provider Adapter boundary: turns a Raw Note into an Internal Document Entry, independent of any specific Provider. */
export type ProviderAdapter = (note: RawNote) => Promise<InternalDocumentEntry>;

export const mockInterpreter: ProviderAdapter = async (note) => ({
  noteId: note.id,
  notes: [{ heading: "Mock-Notiz", bullets: [`Mock interpretation of: ${note.content}`] }],
  createdAt: new Date().toISOString(),
});

export async function interpretNote(note: RawNote, interpreter: ProviderAdapter): Promise<InternalDocumentEntry> {
  return interpreter(note);
}
