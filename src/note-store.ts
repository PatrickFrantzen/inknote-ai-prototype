export type DocumentStatus = "scribbled" | "interpreted" | "approved" | "exported";

export interface Document {
  id: string;
  content: string;
  createdAt: string;
  status: DocumentStatus;
}

export type NewDocument = Omit<Document, "status"> & { status?: DocumentStatus };

/** Structural subset consumed by the Provider Adapter seam; kept for interpretation.ts until it moves onto Document directly. */
export type RawNote = Pick<Document, "id" | "content" | "createdAt">;

const WORKSPACE_KEY = "inknote:workspace";

function readWorkspace(): Document[] {
  const raw = localStorage.getItem(WORKSPACE_KEY);
  return raw ? (JSON.parse(raw) as Document[]) : [];
}

export function saveDocument(document: NewDocument): Document {
  const saved: Document = { ...document, status: document.status ?? "scribbled" };
  const documents = readWorkspace();
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify([...documents, saved]));
  return saved;
}

export function loadDocument(id: string): Document | null {
  return readWorkspace().find((document) => document.id === id) ?? null;
}

export function listDocuments(): Document[] {
  return readWorkspace();
}

export function deleteDocument(id: string): void {
  const documents = readWorkspace().filter((document) => document.id !== id);
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(documents));
}
