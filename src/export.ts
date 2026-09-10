import type { BillableData } from "./billable-data";
import type { InternalDocumentEntry } from "./interpretation";
import type { Document } from "./note-store";
import { approveDocument, loadDocument, markExported } from "./note-store";
import { effectiveInterpretation } from "./review";

const OFFICE_TEXT_LABELS: Record<keyof Omit<BillableData, "customerDetails" | "uncertainty">, string> = {
  activity: "Tätigkeit",
  materials: "Material",
  quantityUnit: "Menge/Einheit",
  time: "Zeit",
  estimate: "Schätzung",
  officeReminder: "Büro-Hinweis",
  transcription: "Transkription",
};

function formatCustomerDetails(billableData: BillableData): string[] {
  const { customerDetails } = billableData;
  if (!customerDetails?.name && !customerDetails?.address) return [];
  return [`Kunde: ${[customerDetails?.name, customerDetails?.address].filter(Boolean).join(", ")}`];
}

function formatBillableDataFields(
  billableData: BillableData,
  labels: Partial<Record<keyof typeof OFFICE_TEXT_LABELS, string>>,
): string[] {
  const lines: string[] = [];
  for (const [field, label] of Object.entries(labels) as Array<[keyof typeof OFFICE_TEXT_LABELS, string]>) {
    const value = billableData[field];
    if (!value) continue;
    lines.push(`${label}: ${Array.isArray(value) ? value.join(", ") : value}`);
  }
  return lines;
}

/** Plain-text summary of the Reviewed Interpretation, suitable for pasting into another tool. */
export function toOfficeText(entry: InternalDocumentEntry): string {
  return entry.notes
    .map((note, index) => {
      const lines = [
        `Notiz ${index + 1}`,
        ...formatCustomerDetails(note.billableData),
        ...formatBillableDataFields(note.billableData, OFFICE_TEXT_LABELS),
      ];
      return lines.join("\n");
    })
    .join("\n\n");
}

const INVOICE_PREP_LABELS: Partial<Record<keyof typeof OFFICE_TEXT_LABELS, string>> = {
  materials: "Material",
  quantityUnit: "Menge/Einheit",
  time: "Zeit",
  estimate: "Schätzung",
};

/** Invoice-relevant fields only, explicitly labeled as preparation input -- never a final invoice. */
export function toInvoicePreparationText(entry: InternalDocumentEntry): string {
  const notes = entry.notes
    .map((note, index) => {
      const lines = [
        `Notiz ${index + 1}`,
        ...formatCustomerDetails(note.billableData),
        ...formatBillableDataFields(note.billableData, INVOICE_PREP_LABELS),
      ];
      return lines.join("\n");
    })
    .join("\n\n");

  return `Rechnungsvorbereitung (kein Rechnungsentwurf)\n\n${notes}`;
}

const JSON_EXPORT_SCHEMA_VERSION = 1;

export interface VersionedJsonExport {
  schemaVersion: number;
  noteId: string;
  createdAt: string;
  notes: Array<{ billableData: BillableData }>;
}

/** Explicit export contract mapped field-by-field from the internal model, so internal refactors don't leak into exported JSON. */
export function toVersionedJson(entry: InternalDocumentEntry): VersionedJsonExport {
  return {
    schemaVersion: JSON_EXPORT_SCHEMA_VERSION,
    noteId: entry.noteId,
    createdAt: entry.createdAt,
    notes: entry.notes.map((note) => ({ billableData: { ...note.billableData } })),
  };
}

/** Exports a Document: exporting also counts as approving, so an un-approved Document is approved first, then marked exported. */
export function exportDocument(documentId: string): Document {
  const document = loadDocument(documentId);
  if (!document) throw new Error(`Cannot export document: ${documentId} not found`);
  if (!effectiveInterpretation(document)) {
    throw new Error(`Cannot export document ${documentId}: it has no interpretation yet`);
  }

  if (document.status !== "approved") {
    approveDocument(documentId);
  }
  return markExported(documentId);
}
