import { expect, test } from "vitest";
import { filterDocuments } from "../src/document-list";
import type { Document } from "../src/note-store";

const scribbled: Document = { id: "doc-1", content: "[]", createdAt: "2026-01-01T10:00:00.000Z", status: "scribbled" };
const interpreted: Document = {
  id: "doc-2",
  content: "[]",
  createdAt: "2026-01-02T10:00:00.000Z",
  status: "interpreted",
  interpretation: {
    noteId: "doc-2",
    notes: [{ billableData: { transcription: "Ventil getauscht, Dichtung bestellt" } }],
    createdAt: "2026-01-02T10:05:00.000Z",
  },
};

test("with no options, all documents are returned", () => {
  expect(filterDocuments([scribbled, interpreted], {})).toEqual([scribbled, interpreted]);
});

test("query filters by the effective interpretation's content, case-insensitively", () => {
  expect(filterDocuments([scribbled, interpreted], { query: "dichtung" })).toEqual([interpreted]);
  expect(filterDocuments([scribbled, interpreted], { query: "DICHTUNG" })).toEqual([interpreted]);
});

test("a document with no interpretation never matches a text query", () => {
  expect(filterDocuments([scribbled], { query: "anything" })).toEqual([]);
});

test("query matching nothing returns an empty list", () => {
  expect(filterDocuments([scribbled, interpreted], { query: "nonexistent" })).toEqual([]);
});

test("statuses filters the list to only the given Document Lifecycle statuses", () => {
  expect(filterDocuments([scribbled, interpreted], { statuses: ["interpreted"] })).toEqual([interpreted]);
});

test("statuses with multiple values keeps documents matching any of them", () => {
  expect(filterDocuments([scribbled, interpreted], { statuses: ["scribbled", "interpreted"] })).toEqual([
    scribbled,
    interpreted,
  ]);
});

test("query and statuses combine as an AND filter", () => {
  expect(filterDocuments([scribbled, interpreted], { query: "dichtung", statuses: ["scribbled"] })).toEqual([]);
  expect(filterDocuments([scribbled, interpreted], { query: "dichtung", statuses: ["interpreted"] })).toEqual([
    interpreted,
  ]);
});
