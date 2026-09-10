import type { Stroke } from "./canvas-input";
import type { ProviderAdapter, InternalDocumentEntry } from "./interpretation";
import { interpretNote } from "./interpretation";
import type { Document } from "./note-store";
import { listDocuments, saveDocument } from "./note-store";

export function saveDrawnNote(strokes: Stroke[]): Document {
  return saveDocument({
    id: crypto.randomUUID(),
    content: JSON.stringify(strokes),
    createdAt: new Date().toISOString(),
  });
}

function loadLatestDocument(): Document | null {
  const documents = listDocuments();
  return documents.length === 0
    ? null
    : documents.reduce((latest, document) => (document.createdAt > latest.createdAt ? document : latest));
}

export async function interpretLatestNote(interpreter: ProviderAdapter): Promise<InternalDocumentEntry | null> {
  const document = loadLatestDocument();
  return document ? interpretNote(document, interpreter) : null;
}
