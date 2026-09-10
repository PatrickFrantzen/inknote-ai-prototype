import { beforeEach, expect, test } from "vitest";
import { exportDocument, toInvoicePreparationText, toOfficeText, toVersionedJson } from "../src/export";
import { approveDocument, loadDocument, saveDocument, saveInterpretation } from "../src/note-store";
import type { InternalDocumentEntry } from "../src/interpretation";

beforeEach(() => {
  localStorage.clear();
});

test("office text lists only the present billable data fields for each detected note", () => {
  const entry: InternalDocumentEntry = {
    noteId: "doc-1",
    notes: [{ billableData: { activity: "Ventil getauscht", estimate: "80 EUR" } }],
    createdAt: "2026-01-01T10:05:00.000Z",
  };

  const text = toOfficeText(entry);

  expect(text).toContain("Tätigkeit: Ventil getauscht");
  expect(text).toContain("Schätzung: 80 EUR");
  expect(text).not.toContain("Material");
});

test("invoice preparation text includes a disclaimer that it is not a final invoice", () => {
  const entry: InternalDocumentEntry = {
    noteId: "doc-2",
    notes: [{ billableData: { materials: ["Dichtung"], estimate: "80 EUR" } }],
    createdAt: "2026-01-01T10:05:00.000Z",
  };

  const text = toInvoicePreparationText(entry);

  expect(text).toContain("kein Rechnungsentwurf");
  expect(text).toContain("Material: Dichtung");
  expect(text).toContain("Schätzung: 80 EUR");
});

test("versioned json export maps the entry through an explicit contract with a schema version", () => {
  const entry: InternalDocumentEntry = {
    noteId: "doc-3",
    notes: [{ billableData: { activity: "Ventil getauscht", uncertainty: ["estimate"] } }],
    createdAt: "2026-01-01T10:05:00.000Z",
  };

  expect(toVersionedJson(entry)).toEqual({
    schemaVersion: 1,
    noteId: "doc-3",
    createdAt: "2026-01-01T10:05:00.000Z",
    notes: [{ billableData: { activity: "Ventil getauscht", uncertainty: ["estimate"] } }],
  });
});

test("exporting an interpreted (not yet approved) document ends up exported", () => {
  saveDocument({ id: "doc-4", content: "buy screws", createdAt: "2026-01-01T10:00:00.000Z" });
  saveInterpretation("doc-4", {
    noteId: "doc-4",
    notes: [{ billableData: { activity: "Ventil getauscht" } }],
    createdAt: "2026-01-01T10:05:00.000Z",
  });

  const exported = exportDocument("doc-4");

  expect(exported.status).toBe("exported");
  expect(loadDocument("doc-4")?.status).toBe("exported");
});

test("exporting an already-approved document also ends up exported", () => {
  saveDocument({ id: "doc-5", content: "buy screws", createdAt: "2026-01-01T10:00:00.000Z" });
  saveInterpretation("doc-5", {
    noteId: "doc-5",
    notes: [{ billableData: { activity: "Ventil getauscht" } }],
    createdAt: "2026-01-01T10:05:00.000Z",
  });
  approveDocument("doc-5");

  const exported = exportDocument("doc-5");

  expect(exported.status).toBe("exported");
});

test("exporting a document with no interpretation yet is refused", () => {
  saveDocument({ id: "doc-6", content: "buy screws", createdAt: "2026-01-01T10:00:00.000Z" });

  expect(() => exportDocument("doc-6")).toThrow(/no interpretation/);
});
