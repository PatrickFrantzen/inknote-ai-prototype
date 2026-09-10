import { effectiveInterpretation } from "./review";
import type { Document, DocumentStatus } from "./note-store";

export interface FilterDocumentsOptions {
  query?: string;
  statuses?: DocumentStatus[];
}

function searchableText(document: Document): string {
  const entry = effectiveInterpretation(document);
  if (!entry) return "";

  return entry.notes
    .map((note) => {
      const { billableData } = note;
      const parts: Array<string | undefined> = [
        billableData.transcription,
        billableData.activity,
        billableData.officeReminder,
        billableData.customerDetails?.name,
        billableData.customerDetails?.address,
        ...(billableData.materials ?? []),
      ];
      return parts.filter(Boolean).join(" ");
    })
    .join(" ")
    .toLowerCase();
}

/** Assembled, lowercased text of a Document's effective interpretation, for display or search. Empty for a Document with no interpretation yet. */
export function documentSearchSnippet(document: Document): string {
  return searchableText(document);
}

export function filterDocuments(documents: Document[], options: FilterDocumentsOptions): Document[] {
  const query = options.query?.trim().toLowerCase();
  return documents.filter((document) => {
    if (options.statuses && !options.statuses.includes(document.status)) return false;
    if (query && !searchableText(document).includes(query)) return false;
    return true;
  });
}
