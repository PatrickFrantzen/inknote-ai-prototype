import { beforeEach, expect, test } from "vitest";
import { interpretLatestNote, saveDrawnNote } from "../src/app";
import { loadDocument } from "../src/note-store";
import type { ProviderAdapter } from "../src/interpretation";

beforeEach(() => {
  localStorage.clear();
});

test("saving drawn strokes persists them as a new document, loadable by its id", () => {
  const strokes = [
    [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ],
  ];

  const document = saveDrawnNote(strokes);

  expect(loadDocument(document.id)).toEqual(document);
});

test("saving drawn strokes twice creates two independent documents", () => {
  const first = saveDrawnNote([[{ x: 0, y: 0 }]]);
  const second = saveDrawnNote([[{ x: 1, y: 1 }]]);

  expect(first.id).not.toEqual(second.id);
  expect(loadDocument(first.id)).toEqual(first);
  expect(loadDocument(second.id)).toEqual(second);
});

test("interpreting with nothing saved yet returns null", async () => {
  const stubInterpreter: ProviderAdapter = () => {
    throw new Error("should not be called");
  };

  expect(await interpretLatestNote(stubInterpreter)).toBeNull();
});

test("interpreting the latest saved note sends it through the given interpreter", async () => {
  const strokes = [
    [
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    ],
  ];
  const note = saveDrawnNote(strokes);
  const stubInterpreter: ProviderAdapter = async (n) => ({
    noteId: n.id,
    notes: [{ heading: "Stub", bullets: ["stub bullet"] }],
    createdAt: "2026-01-01T00:00:00.000Z",
  });

  expect(await interpretLatestNote(stubInterpreter)).toEqual({
    noteId: note.id,
    notes: [{ heading: "Stub", bullets: ["stub bullet"] }],
    createdAt: "2026-01-01T00:00:00.000Z",
  });
});
