import { beforeEach, expect, test } from "vitest";
import { interpretLatestNote, saveDrawnNote } from "../src/app";
import { loadLatestNote } from "../src/note-store";
import type { Interpreter } from "../src/interpretation";

beforeEach(() => {
  localStorage.clear();
});

test("saving drawn strokes persists them as the latest raw note", () => {
  const strokes = [
    [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ],
  ];

  const note = saveDrawnNote(strokes);

  expect(loadLatestNote()).toEqual(note);
});

test("interpreting with nothing saved yet returns null", async () => {
  const stubInterpreter: Interpreter = () => {
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
  const stubInterpreter: Interpreter = async (n) => ({
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
