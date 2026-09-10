import { beforeEach, expect, test } from "vitest";
import {
  approveDocument,
  deleteDocument,
  listDocuments,
  loadDocument,
  saveDocument,
  saveInterpretation,
  saveReviewedInterpretation,
} from "../src/note-store";
import type { InternalDocumentEntry } from "../src/interpretation";


beforeEach(() => {
  localStorage.clear();
});

test("saving a document makes it loadable by id, defaulting to scribbled status", () => {
  const document = {
    id: "doc-1",
    content: "buy screws, call landlord",
    createdAt: "2026-01-01T10:00:00.000Z",
  };

  saveDocument(document);

  expect(loadDocument("doc-1")).toEqual({ ...document, status: "scribbled" });
});

test("multiple documents can be saved and loaded independently", () => {
  const first = { id: "doc-1", content: "first note", createdAt: "2026-01-01T10:00:00.000Z" };
  const second = { id: "doc-2", content: "second note", createdAt: "2026-01-02T10:00:00.000Z" };

  saveDocument(first);
  saveDocument(second);

  expect(loadDocument("doc-1")).toEqual({ ...first, status: "scribbled" });
  expect(loadDocument("doc-2")).toEqual({ ...second, status: "scribbled" });
});

test("loading an unknown document id returns null", () => {
  expect(loadDocument("does-not-exist")).toBeNull();
});

test("listing documents returns every saved document", () => {
  const first = { id: "doc-1", content: "first note", createdAt: "2026-01-01T10:00:00.000Z" };
  const second = { id: "doc-2", content: "second note", createdAt: "2026-01-02T10:00:00.000Z" };

  saveDocument(first);
  saveDocument(second);

  expect(listDocuments()).toEqual([
    { ...first, status: "scribbled" },
    { ...second, status: "scribbled" },
  ]);
});

test("deleting a document removes only that document", () => {
  const first = { id: "doc-1", content: "first note", createdAt: "2026-01-01T10:00:00.000Z" };
  const second = { id: "doc-2", content: "second note", createdAt: "2026-01-02T10:00:00.000Z" };
  saveDocument(first);
  saveDocument(second);

  deleteDocument("doc-1");

  expect(loadDocument("doc-1")).toBeNull();
  expect(loadDocument("doc-2")).toEqual({ ...second, status: "scribbled" });
});

test("saving an interpretation attaches it to the document and moves status to interpreted", () => {
  const document = { id: "doc-1", content: "buy screws", createdAt: "2026-01-01T10:00:00.000Z" };
  saveDocument(document);
  const entry: InternalDocumentEntry = {
    noteId: "doc-1",
    notes: [{ billableData: { transcription: "buy screws" } }],
    createdAt: "2026-01-01T10:05:00.000Z",
  };

  const updated = saveInterpretation("doc-1", entry);

  expect(updated).toEqual({ ...document, status: "interpreted", interpretation: entry });
  expect(loadDocument("doc-1")).toEqual({ ...document, status: "interpreted", interpretation: entry });
});

test("saving a reviewed interpretation leaves the original interpretation untouched", () => {
  const document = { id: "doc-1", content: "buy screws", createdAt: "2026-01-01T10:00:00.000Z" };
  saveDocument(document);
  const original: InternalDocumentEntry = {
    noteId: "doc-1",
    notes: [{ billableData: { transcription: "buy screws" } }],
    createdAt: "2026-01-01T10:05:00.000Z",
  };
  saveInterpretation("doc-1", original);
  const reviewed: InternalDocumentEntry = {
    noteId: "doc-1",
    notes: [{ billableData: { transcription: "buy screws", activity: "Schrauben besorgt" } }],
    createdAt: "2026-01-01T10:05:00.000Z",
  };

  const updated = saveReviewedInterpretation("doc-1", reviewed);

  expect(updated.interpretation).toEqual(original);
  expect(updated.reviewedInterpretation).toEqual(reviewed);
  expect(loadDocument("doc-1")?.interpretation).toEqual(original);
  expect(loadDocument("doc-1")?.reviewedInterpretation).toEqual(reviewed);
});

test("saving a fresh interpretation replaces the previous one and clears any review", () => {
  const document = { id: "doc-1", content: "buy screws", createdAt: "2026-01-01T10:00:00.000Z" };
  saveDocument(document);
  saveInterpretation("doc-1", {
    noteId: "doc-1",
    notes: [{ billableData: { transcription: "buy screws" } }],
    createdAt: "2026-01-01T10:05:00.000Z",
  });
  saveReviewedInterpretation("doc-1", {
    noteId: "doc-1",
    notes: [{ billableData: { transcription: "buy screws", activity: "reviewed" } }],
    createdAt: "2026-01-01T10:05:00.000Z",
  });

  const rerun: InternalDocumentEntry = {
    noteId: "doc-1",
    notes: [{ billableData: { transcription: "buy screws, order filament" } }],
    createdAt: "2026-01-01T10:10:00.000Z",
  };
  const updated = saveInterpretation("doc-1", rerun);

  expect(updated.interpretation).toEqual(rerun);
  expect(updated.reviewedInterpretation).toBeUndefined();
  expect(loadDocument("doc-1")?.reviewedInterpretation).toBeUndefined();
});

test("approving an interpreted document moves it to approved", () => {
  const document = { id: "doc-1", content: "buy screws", createdAt: "2026-01-01T10:00:00.000Z" };
  saveDocument(document);
  saveInterpretation("doc-1", {
    noteId: "doc-1",
    notes: [{ billableData: { transcription: "buy screws" } }],
    createdAt: "2026-01-01T10:05:00.000Z",
  });

  const approved = approveDocument("doc-1");

  expect(approved.status).toBe("approved");
  expect(loadDocument("doc-1")?.status).toBe("approved");
});

test("approving a document that has not been interpreted yet is refused", () => {
  saveDocument({ id: "doc-1", content: "buy screws", createdAt: "2026-01-01T10:00:00.000Z" });

  expect(() => approveDocument("doc-1")).toThrow(/not been interpreted/);
});
