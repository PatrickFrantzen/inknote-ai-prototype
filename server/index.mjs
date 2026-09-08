// Minimal local proxy for the OpenAI-backed interpreter. Exists only so the
// OpenAI API key stays server-side (OpenAI explicitly warns against calling
// the API with a secret key directly from browser code). Not part of the
// prototype's PWA scope otherwise -- see docs/prototype-scope.md.
import { createServer } from "node:http";

const PORT = process.env.PORT ?? 8787;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-6-astra";
const MAX_BODY_BYTES = 15 * 1024 * 1024; // room for a base64 PNG well under OpenAI's 20MB image limit

const INTERPRETATION_PROMPT =
  "Du bekommst das Bild einer handschriftlichen Notiz. Erstelle daraus einen kurzen, " +
  "strukturierten internen Dokumenteintrag auf Deutsch: fasse die wesentlichen Punkte " +
  "als prägnante Stichpunkte zusammen. Gib nur den Dokumenteintrag zurück, ohne " +
  "zusätzliche Erklärungen oder Rückfragen.";

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

function extractSummary(openAiResponseBody) {
  const message = openAiResponseBody.output?.find((item) => item.type === "message");
  const textPart = message?.content?.find((part) => part.type === "output_text");
  return textPart?.text;
}

async function handleInterpret(req, res) {
  if (!OPENAI_API_KEY) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "OPENAI_API_KEY is not configured on the server" }));
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

  if (typeof body.imageDataUrl !== "string" || !body.imageDataUrl.startsWith("data:image/")) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "imageDataUrl must be a data:image/... URL" }));
    return;
  }

  let openAiResponse;
  try {
    openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: INTERPRETATION_PROMPT },
              { type: "input_image", image_url: body.imageDataUrl, detail: "auto" },
            ],
          },
        ],
      }),
    });
  } catch {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Could not reach the OpenAI API" }));
    return;
  }

  const responseBody = await openAiResponse.json().catch(() => null);

  if (!openAiResponse.ok) {
    console.error("OpenAI API error", openAiResponse.status, responseBody);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `OpenAI API responded with status ${openAiResponse.status}` }));
    return;
  }

  const summary = extractSummary(responseBody);
  if (!summary) {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "OpenAI response did not contain a text summary" }));
    return;
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ summary }));
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
  console.log(`OpenAI interpretation proxy listening on http://localhost:${PORT}`);
  if (!OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY is not set -- requests to /api/interpret will fail with 500.");
  }
});
