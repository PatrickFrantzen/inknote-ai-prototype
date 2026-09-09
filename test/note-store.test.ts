import { beforeEach, expect, test } from "vitest";
import { clearSavedNote, loadLatestNote, saveNote } from "../src/note-store";

beforeEach(() => {
  localStorage.clear();
});

test("saving a raw note makes it the latest loadable note", () => {
  const note = {
    id: "note-1",
    content: "buy screws, call landlord",
    createdAt: "2026-01-01T10:00:00.000Z",
  };

  saveNote(note);

  expect(loadLatestNote()).toEqual(note);
});

test("loading with nothing saved yet returns null", () => {
  expect(loadLatestNote()).toBeNull();
});

test("clearing the saved note removes it, so loading returns null again", () => {
  saveNote({
    id: "note-2",
    content: "order more filament",
    createdAt: "2026-01-02T09:30:00.000Z",
  });

  clearSavedNote();

  expect(loadLatestNote()).toBeNull();
});
