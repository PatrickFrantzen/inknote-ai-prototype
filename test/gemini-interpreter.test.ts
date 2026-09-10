import { expect, test } from "vitest";
import { createGeminiInterpreter } from "../src/gemini-interpreter";
import { NonRetryableProviderError } from "../src/interpretation-job";
import type { RawNote } from "../src/note-store";

function stubFetchReturning(body: unknown, status = 200): typeof fetch {
  return (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;
}

test("interprets a note by posting its rasterized image to the proxy and returns validated Billable Data", async () => {
  const note: RawNote = {
    id: "note-9",
    content: JSON.stringify([[{ x: 0, y: 0 }]]),
    createdAt: "2026-01-01T00:00:00.000Z",
  };
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const stubFetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ notes: [{ activity: "Schrauben bestellen" }] }), { status: 200 });
  }) as typeof fetch;

  const interpreter = createGeminiInterpreter({
    fetchImpl: stubFetch,
    rasterizeStrokes: () => "data:image/png;base64,STUB",
  });

  const entry = await interpreter(note);

  expect(entry.noteId).toBe("note-9");
  expect(entry.notes).toEqual([{ billableData: { activity: "Schrauben bestellen" } }]);
  expect(calls[0]?.url).toBe("/api/interpret");
  expect(JSON.parse(calls[0]?.init.body as string)).toEqual({
    noteId: "note-9",
    imageDataUrl: "data:image/png;base64,STUB",
  });
});

test("preserves uncertainty flags reported by the provider", async () => {
  const note: RawNote = { id: "note-11", content: JSON.stringify([]), createdAt: "2026-01-01T00:00:00.000Z" };
  const interpreter = createGeminiInterpreter({
    fetchImpl: stubFetchReturning({ notes: [{ estimate: "80 EUR", uncertainty: ["estimate"] }] }),
    rasterizeStrokes: () => "data:image/png;base64,STUB",
  });

  const entry = await interpreter(note);

  expect(entry.notes).toEqual([{ billableData: { estimate: "80 EUR", uncertainty: ["estimate"] } }]);
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

test("includes the configured provider settings in the request when given", async () => {
  const note: RawNote = { id: "note-13", content: JSON.stringify([]), createdAt: "2026-01-01T00:00:00.000Z" };
  const calls: Array<{ init: RequestInit }> = [];
  const stubFetch = (async (_url: string, init: RequestInit) => {
    calls.push({ init });
    return new Response(JSON.stringify({ notes: [] }), { status: 200 });
  }) as typeof fetch;

  const interpreter = createGeminiInterpreter({
    fetchImpl: stubFetch,
    rasterizeStrokes: () => "data:image/png;base64,STUB",
    settings: { apiKey: "secret-key", model: "gemini-3.6-flash" },
  });

  await interpreter(note);

  expect(JSON.parse(calls[0]?.init.body as string)).toEqual({
    noteId: "note-13",
    imageDataUrl: "data:image/png;base64,STUB",
    apiKey: "secret-key",
    model: "gemini-3.6-flash",
  });
});

test("rejects a malformed provider response instead of returning corrupted Billable Data", async () => {
  const note: RawNote = { id: "note-12", content: JSON.stringify([]), createdAt: "2026-01-01T00:00:00.000Z" };
  const interpreter = createGeminiInterpreter({
    fetchImpl: stubFetchReturning({ notes: [{ materials: "Dichtung" }] }),
    rasterizeStrokes: () => "data:image/png;base64,STUB",
  });

  await expect(interpreter(note)).rejects.toThrow(NonRetryableProviderError);
});
