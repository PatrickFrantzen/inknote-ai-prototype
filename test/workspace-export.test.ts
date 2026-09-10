import { beforeEach, expect, test } from "vitest";
import { exportWorkspace, importWorkspace, listDocuments, loadDocument, saveDocument, saveInterpretation } from "../src/note-store";

beforeEach(() => {
  localStorage.clear();
});

test("exporting an empty workspace produces a versioned export with no documents", () => {
  expect(exportWorkspace()).toMatchObject({ schemaVersion: 1, documents: [] });
});

test("exporting the workspace includes every saved document", () => {
  const first = saveDocument({ id: "doc-1", content: "first", createdAt: "2026-01-01T10:00:00.000Z" });
  const second = saveDocument({ id: "doc-2", content: "second", createdAt: "2026-01-02T10:00:00.000Z" });

  const exported = exportWorkspace();

  expect(exported.documents).toEqual([first, second]);
  expect(typeof exported.exportedAt).toBe("string");
});

test("round-tripping through export/import restores every document exactly, including status and interpretation", () => {
  saveDocument({ id: "doc-1", content: "buy screws", createdAt: "2026-01-01T10:00:00.000Z" });
  saveInterpretation("doc-1", {
    noteId: "doc-1",
    notes: [{ billableData: { transcription: "buy screws" } }],
    createdAt: "2026-01-01T10:05:00.000Z",
  });
  const exported = exportWorkspace();
  localStorage.clear();

  const result = importWorkspace(exported);

  expect(result).toEqual({ imported: 1, skipped: 0 });
  expect(listDocuments()).toEqual(exported.documents);
});

test("importing a document whose id already exists locally does not overwrite it by default", () => {
  const existing = saveDocument({ id: "doc-1", content: "local version", createdAt: "2026-01-01T10:00:00.000Z" });
  const incomingExport = {
    schemaVersion: 1,
    exportedAt: "2026-01-02T00:00:00.000Z",
    documents: [{ id: "doc-1", content: "imported version", createdAt: "2026-01-02T10:00:00.000Z", status: "scribbled" as const }],
  };

  const result = importWorkspace(incomingExport);

  expect(result).toEqual({ imported: 0, skipped: 1 });
  expect(loadDocument("doc-1")).toEqual(existing);
});

test("importing with onConflict overwrite replaces the local document", () => {
  saveDocument({ id: "doc-1", content: "local version", createdAt: "2026-01-01T10:00:00.000Z" });
  const incomingDocument = { id: "doc-1", content: "imported version", createdAt: "2026-01-02T10:00:00.000Z", status: "scribbled" as const };
  const incomingExport = { schemaVersion: 1, exportedAt: "2026-01-02T00:00:00.000Z", documents: [incomingDocument] };

  const result = importWorkspace(incomingExport, { onConflict: "overwrite" });

  expect(result).toEqual({ imported: 1, skipped: 0 });
  expect(loadDocument("doc-1")).toEqual(incomingDocument);
});

test("importing malformed data is refused without touching the existing workspace", () => {
  saveDocument({ id: "doc-1", content: "local version", createdAt: "2026-01-01T10:00:00.000Z" });

  expect(() => importWorkspace({ notAWorkspaceExport: true } as never)).toThrow(/not a valid/);
  expect(listDocuments()).toHaveLength(1);
});
