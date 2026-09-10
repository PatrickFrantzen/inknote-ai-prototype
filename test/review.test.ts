import { beforeEach, expect, test } from "vitest";
import { applyBillableDataEdit, reviewDocument } from "../src/review";
import { loadDocument, saveDocument, saveInterpretation } from "../src/note-store";
import type { InternalDocumentEntry } from "../src/interpretation";

beforeEach(() => {
  localStorage.clear();
});

const entry: InternalDocumentEntry = {
  noteId: "doc-1",
  notes: [{ billableData: { activity: "Ventil getauscht", estimate: "80 EUR" } }],
  createdAt: "2026-01-01T10:05:00.000Z",
};

test("applying an edit shallow-merges the patch into the given note's billable data", () => {
  const edited = applyBillableDataEdit(entry, 0, { estimate: "95 EUR" });

  expect(edited.notes[0]?.billableData).toEqual({ activity: "Ventil getauscht", estimate: "95 EUR" });
});

test("editing one detected note leaves other detected notes on the same entry untouched", () => {
  const multiNoteEntry: InternalDocumentEntry = {
    noteId: "doc-2",
    notes: [{ billableData: { activity: "Ventil getauscht" } }, { billableData: { activity: "Lampe montiert" } }],
    createdAt: "2026-01-01T10:05:00.000Z",
  };

  const edited = applyBillableDataEdit(multiNoteEntry, 1, { activity: "Lampe getauscht" });

  expect(edited.notes[0]?.billableData).toEqual({ activity: "Ventil getauscht" });
  expect(edited.notes[1]?.billableData).toEqual({ activity: "Lampe getauscht" });
});

test("reviewing a document persists a reviewed interpretation, leaving the original untouched", () => {
  saveDocument({ id: "doc-3", content: "buy screws", createdAt: "2026-01-01T10:00:00.000Z" });
  const original: InternalDocumentEntry = {
    noteId: "doc-3",
    notes: [{ billableData: { activity: "Ventil getauscht", estimate: "80 EUR" } }],
    createdAt: "2026-01-01T10:05:00.000Z",
  };
  saveInterpretation("doc-3", original);

  reviewDocument("doc-3", 0, { estimate: "95 EUR" });

  const document = loadDocument("doc-3");
  expect(document?.interpretation).toEqual(original);
  expect(document?.reviewedInterpretation?.notes[0]?.billableData).toEqual({
    activity: "Ventil getauscht",
    estimate: "95 EUR",
  });
});

test("reviewing a document twice composes both edits", () => {
  saveDocument({ id: "doc-4", content: "buy screws", createdAt: "2026-01-01T10:00:00.000Z" });
  saveInterpretation("doc-4", {
    noteId: "doc-4",
    notes: [{ billableData: { activity: "Ventil getauscht", estimate: "80 EUR" } }],
    createdAt: "2026-01-01T10:05:00.000Z",
  });

  reviewDocument("doc-4", 0, { estimate: "95 EUR" });
  reviewDocument("doc-4", 0, { activity: "Ventil komplett getauscht" });

  expect(loadDocument("doc-4")?.reviewedInterpretation?.notes[0]?.billableData).toEqual({
    activity: "Ventil komplett getauscht",
    estimate: "95 EUR",
  });
});
