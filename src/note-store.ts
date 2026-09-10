import type { InternalDocumentEntry } from "./interpretation";

export type DocumentStatus = "scribbled" | "interpreted" | "approved" | "exported";

export interface Document {
  id: string;
  content: string;
  createdAt: string;
  status: DocumentStatus;
  interpretation?: InternalDocumentEntry;
  /** The user-edited interpretation, distinct from the original machine `interpretation`. */
  reviewedInterpretation?: InternalDocumentEntry;
}

export type NewDocument = Omit<Document, "status"> & { status?: DocumentStatus };

/** Structural subset consumed by the Provider Adapter seam; kept for interpretation.ts until it moves onto Document directly. */
export type RawNote = Pick<Document, "id" | "content" | "createdAt">;

const WORKSPACE_KEY = "inknote:workspace";

function readWorkspace(): Document[] {
  const raw = localStorage.getItem(WORKSPACE_KEY);
  return raw ? (JSON.parse(raw) as Document[]) : [];
}

function writeWorkspace(documents: Document[]): void {
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(documents));
}

export function saveDocument(document: NewDocument): Document {
  const saved: Document = { ...document, status: document.status ?? "scribbled" };
  writeWorkspace([...readWorkspace(), saved]);
  return saved;
}

export function loadDocument(id: string): Document | null {
  return readWorkspace().find((document) => document.id === id) ?? null;
}

export function listDocuments(): Document[] {
  return readWorkspace();
}

export function deleteDocument(id: string): void {
  writeWorkspace(readWorkspace().filter((document) => document.id !== id));
}

export function saveInterpretation(id: string, entry: InternalDocumentEntry): Document {
  const documents = readWorkspace();
  const index = documents.findIndex((document) => document.id === id);
  if (index === -1) throw new Error(`Cannot save interpretation: document ${id} not found`);

  // A rerun replaces the previous interpretation entirely (no history kept in v0.1), so any
  // prior review -- made against the interpretation being replaced -- is cleared with it.
  const updated: Document = { ...documents[index]!, status: "interpreted", interpretation: entry, reviewedInterpretation: undefined };
  documents[index] = updated;
  writeWorkspace(documents);
  return updated;
}

export function approveDocument(id: string): Document {
  const documents = readWorkspace();
  const index = documents.findIndex((document) => document.id === id);
  if (index === -1) throw new Error(`Cannot approve document: ${id} not found`);
  const document = documents[index]!;
  if (document.status === "scribbled") {
    throw new Error(`Cannot approve document ${id}: it has not been interpreted yet`);
  }

  const updated: Document = { ...document, status: "approved" };
  documents[index] = updated;
  writeWorkspace(documents);
  return updated;
}

export function markExported(id: string): Document {
  const documents = readWorkspace();
  const index = documents.findIndex((document) => document.id === id);
  if (index === -1) throw new Error(`Cannot mark exported: document ${id} not found`);

  const updated: Document = { ...documents[index]!, status: "exported" };
  documents[index] = updated;
  writeWorkspace(documents);
  return updated;
}

export function saveReviewedInterpretation(id: string, entry: InternalDocumentEntry): Document {
  const documents = readWorkspace();
  const index = documents.findIndex((document) => document.id === id);
  if (index === -1) throw new Error(`Cannot save reviewed interpretation: document ${id} not found`);

  const updated: Document = { ...documents[index]!, reviewedInterpretation: entry };
  documents[index] = updated;
  writeWorkspace(documents);
  return updated;
}
