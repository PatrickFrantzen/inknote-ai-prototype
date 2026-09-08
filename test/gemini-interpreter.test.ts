import { expect, test } from "vitest";
import { createGeminiInterpreter } from "../src/gemini-interpreter";
import type { RawNote } from "../src/note-store";

test("interprets a note by posting its rasterized image to the proxy and returns the resulting notes", async () => {
  const note: RawNote = {
    id: "note-9",
    content: JSON.stringify([[{ x: 0, y: 0 }]]),
    createdAt: "2026-01-01T00:00:00.000Z",
  };
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const stubFetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(
      JSON.stringify({ notes: [{ heading: "Einkauf", bullets: ["Schrauben bestellen"] }] }),
      { status: 200 },
    );
  }) as typeof fetch;

  const interpreter = createGeminiInterpreter({
    fetchImpl: stubFetch,
    rasterizeStrokes: () => "data:image/png;base64,STUB",
  });

  const entry = await interpreter(note);

  expect(entry.noteId).toBe("note-9");
  expect(entry.notes).toEqual([{ heading: "Einkauf", bullets: ["Schrauben bestellen"] }]);
  expect(calls[0]?.url).toBe("/api/interpret");
  expect(JSON.parse(calls[0]?.init.body as string)).toEqual({
    noteId: "note-9",
    imageDataUrl: "data:image/png;base64,STUB",
  });
});

test("throws a descriptive error when the proxy responds with a failure status", async () => {
  const note: RawNote = {
    id: "note-10",
    content: JSON.stringify([]),
    createdAt: "2026-01-01T00:00:00.000Z",
  };
  const stubFetch = (async () => new Response("upstream error", { status: 500 })) as typeof fetch;

  const interpreter = createGeminiInterpreter({
    fetchImpl: stubFetch,
    rasterizeStrokes: () => "data:image/png;base64,STUB",
  });

  await expect(interpreter(note)).rejects.toThrow(/500/);
});
