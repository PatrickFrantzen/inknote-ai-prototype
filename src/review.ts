import type { BillableData } from "./billable-data";
import type { InternalDocumentEntry } from "./interpretation";
import type { Document } from "./note-store";
import { loadDocument, saveReviewedInterpretation } from "./note-store";

/** Shallow-merges a patch into one Detected Note's Billable Data, leaving every other note untouched. */
export function applyBillableDataEdit(
  entry: InternalDocumentEntry,
  noteIndex: number,
  patch: Partial<BillableData>,
): InternalDocumentEntry {
  return {
    ...entry,
    notes: entry.notes.map((note, index) =>
      index === noteIndex ? { billableData: { ...note.billableData, ...patch } } : note,
    ),
  };
}

/** The interpretation that should drive review/export: the user's edits if any exist, otherwise the original machine interpretation. */
export function effectiveInterpretation(document: Document): InternalDocumentEntry | null {
  return document.reviewedInterpretation ?? document.interpretation ?? null;
}

/** Edits one Detected Note's Billable Data and persists the result as the Document's Reviewed Interpretation, leaving the original machine interpretation untouched. Composes with any prior review. */
export function reviewDocument(documentId: string, noteIndex: number, patch: Partial<BillableData>): Document {
  const document = loadDocument(documentId);
  if (!document) throw new Error(`Cannot review document: ${documentId} not found`);

  const base = document.reviewedInterpretation ?? document.interpretation;
  if (!base) throw new Error(`Cannot review document ${documentId}: it has no interpretation yet`);

  const reviewed = applyBillableDataEdit(base, noteIndex, patch);
  return saveReviewedInterpretation(documentId, reviewed);
}
