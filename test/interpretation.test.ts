import { expect, test } from "vitest";
import type { RawNote } from "../src/note-store";
import type { Interpreter, InternalDocumentEntry } from "../src/interpretation";
import { interpretNote, mockInterpreter } from "../src/interpretation";

test("the mock interpreter turns a raw note into a structured internal document entry", () => {
  const note: RawNote = {
    id: "note-1",
    content: "order more filament",
    createdAt: "2026-01-01T10:00:00.000Z",
  };

  const entry = mockInterpreter(note);

  expect(entry.noteId).toBe("note-1");
  expect(entry.summary).toContain("order more filament");
  expect(new Date(entry.createdAt).toString()).not.toBe("Invalid Date");
});

test("interpretNote sends the raw note through the given interpreter", () => {
  const note: RawNote = {
    id: "note-2",
    content: "fix leaking valve",
    createdAt: "2026-01-02T09:00:00.000Z",
  };
  const stubEntry: InternalDocumentEntry = {
    noteId: "note-2",
    summary: "leaking valve needs repair",
    createdAt: "2026-01-02T09:05:00.000Z",
  };
  const stubInterpreter: Interpreter = () => stubEntry;

  expect(interpretNote(note, stubInterpreter)).toEqual(stubEntry);
});
