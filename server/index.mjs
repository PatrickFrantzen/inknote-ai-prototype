// Minimal local proxy for the Gemini-backed interpreter. Exists only so the
// Gemini API key stays server-side (calling a Google API with a secret key
// directly from browser code would expose it to anyone opening devtools).
// Not part of the prototype's PWA scope otherwise -- see docs/prototype-scope.md.
import { createServer } from "node:http";

const PORT = process.env.PORT ?? 8787;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";
const MAX_BODY_BYTES = 15 * 1024 * 1024; // room for a base64 PNG well under Gemini's 20MB inline request limit

const INTERPRETATION_PROMPT =
  "Du bekommst das Bild eines Notizblatts mit einer oder mehreren handschriftlichen " +
  "Einzelnotizen (räumlich oder inhaltlich voneinander abgegrenzt). Erkenne jede " +
  "einzelne Notiz separat und werte sie aus. Gib für jede Notiz eine kurze Überschrift " +
  "(Thema/Stichwort) und die wesentlichen Punkte als prägnante Stichpunkte auf Deutsch " +
  "zurück. Antworte ausschließlich im vorgegebenen JSON-Schema, ohne zusätzliche " +
  "Erklärungen oder Rückfragen.";

const NOTES_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    notes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          heading: { type: "string" },
          bullets: { type: "array", items: { type: "string" } },
        },
        required: ["heading", "bullets"],
      },
    },
  },
  required: ["notes"],
};

async function readJsonBody(req) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_BODY_BYTES) {
      throw new Error("Request body too large");
    }
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function parseDataUrl(dataUrl) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

function isValidDetectedNote(note) {
  return (
    note !== null &&
    typeof note === "object" &&
    typeof note.heading === "string" &&
    Array.isArray(note.bullets) &&
    note.bullets.every((bullet) => typeof bullet === "string")
  );
}

function extractNotes(geminiResponseBody) {
  const parts = geminiResponseBody.candidates?.[0]?.content?.parts ?? [];
  const text = parts.find((part) => typeof part.text === "string")?.text;
  if (!text) return null;

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed?.notes) || !parsed.notes.every(isValidDetectedNote)) {
    return null;
  }
  return parsed.notes;
}

async function handleInterpret(req, res) {
  if (!GEMINI_API_KEY) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "GEMINI_API_KEY is not configured on the server" }));
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Invalid request body" }));
    return;
  }

  const image = typeof body.imageDataUrl === "string" ? parseDataUrl(body.imageDataUrl) : null;
  if (!image) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "imageDataUrl must be a data:image/...;base64,... URL" }));
    return;
  }

  let geminiResponse;
  try {
    geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": GEMINI_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: image.mimeType, data: image.data } },
                { text: INTERPRETATION_PROMPT },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: NOTES_RESPONSE_SCHEMA,
          },
        }),
      },
    );
  } catch {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Could not reach the Gemini API" }));
    return;
  }

  const responseBody = await geminiResponse.json().catch(() => null);

  if (!geminiResponse.ok) {
    console.error("Gemini API error", geminiResponse.status, responseBody);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `Gemini API responded with status ${geminiResponse.status}` }));
    return;
  }

  const notes = extractNotes(responseBody);
  if (!notes) {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Gemini response did not contain valid structured notes" }));
    return;
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ notes }));
}

const server = createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/interpret") {
    handleInterpret(req, res).catch((error) => {
      console.error("Unexpected error handling /api/interpret", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    });
    return;
  }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`Gemini interpretation proxy listening on http://localhost:${PORT}`);
  if (!GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set -- requests to /api/interpret will fail with 500.");
  }
});
