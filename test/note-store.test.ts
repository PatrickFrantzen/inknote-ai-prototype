import { beforeEach, expect, test } from "vitest";
import { deleteDocument, listDocuments, loadDocument, saveDocument } from "../src/note-store";


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
