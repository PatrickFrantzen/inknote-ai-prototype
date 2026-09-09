<!--
Notes on the real Gemini integration added for the interpretation seam, for
whoever (human or agent) needs to run or extend it.
-->

# Gemini integration

## Why Gemini, and billing

Google's Gemini API has a genuinely free tier (Flash models): no credit card,
an API key from Google AI Studio, and quotas generous enough for a prototype
(roughly 15 requests/minute, 1500/day at the time of writing -- Google can
change this without notice, so check <https://ai.google.dev/gemini-api/docs/rate-limits>
if you hit a quota error). This replaced an earlier OpenAI-based version: a
ChatGPT Plus/Pro subscription does not cover OpenAI API usage (separate
billing on platform.openai.com), and that also holds for ChatGPT Pro's
included Codex usage -- that coverage only applies when Codex itself is
authenticated via "Sign in with ChatGPT", not to a custom app calling the API
with a platform key.

## Why there's a server at all

Calling a provider API with a secret key directly from browser code exposes
that key to anyone opening devtools. `docs/prototype-scope.md` otherwise rules
out a backend for this prototype; `server/index.mjs` is a narrow exception
that exists only to keep the key off the client. It has no persistence, auth,
or deployment story -- it is a local dev proxy, not a real backend.

## Setup

`server/index.mjs` reads `GEMINI_API_KEY` (and optional `GEMINI_MODEL`) from
`process.env`, so either of these works:

**Local machine (or anywhere you can create files):**

```bash
cp .env.example .env
# edit .env: paste your GEMINI_API_KEY (get one at https://aistudio.google.com/apikey)
npm run server   # starts the proxy on http://localhost:8787
npm run dev      # starts the app; Vite proxies /api/* to the server above
```

**Claude Code on the web / mobile (no local filesystem to hand):** set
`GEMINI_API_KEY` as a cloud environment variable instead of a `.env` file --
open the environment's settings (the cloud icon next to the message box on
claude.ai/code, gear icon on hover) and add it under **Environment
variables**. That dialog isn't exposed in the native mobile app, so do this
step from a browser (mobile browser works) if you're on mobile; the value
then applies to every session in that environment afterwards, mobile app
included. New sessions pick it up automatically -- a session already running
when you set it won't see it until you start a new one. No `.env` file or
code change needed either way.

Then tick "Echte Gemini-Interpretation" in the UI before pressing "Interpretieren".
Untick it to fall back to the mocked interpreter without needing the server running.

## How it works

1. `src/canvas-input.ts` records the drawn strokes (point coordinates only).
2. `src/gemini-interpreter.ts` (`createGeminiInterpreter`) rasterizes those
   strokes onto an offscreen `<canvas>` to get a PNG data URL, then POSTs
   `{ noteId, imageDataUrl }` to `/api/interpret`.
3. `server/index.mjs` receives that request, splits the data URL into
   `mimeType`/base64 `data`, and calls the Gemini API
   (`POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`)
   with an `inline_data` image part plus a German text prompt. The prompt
   frames the image as a note sheet that may contain several separate
   handwritten notes and asks Gemini to detect each one individually. The
   request also sets `generationConfig.responseMimeType` to
   `application/json` with a `responseSchema` (`{ notes: [{ heading,
   bullets }] }`), so Gemini returns structured JSON instead of free text.
   The server parses and validates that JSON before relaying it back as
   `{ notes }`.
4. The client wraps that into an `InternalDocumentEntry` (see
   `src/interpretation.ts`), whose `notes: DetectedNote[]` field holds one
   entry per detected note -- the same shape the mock interpreter produces,
   so the rest of the app (`src/app.ts`, `src/main.ts`) doesn't care which
   interpreter is active.

## Model

Configured via `GEMINI_MODEL` in `.env`, defaulting to `gemini-3.6-flash`
(confirmed multimodal input: text, image, video, audio; on the free tier).
`gemini-2.5-flash` was the original default but is no longer available to
new users as of testing on 2026-09-08 (Google's API returns 404 and points
to `gemini-3.6-flash` instead). Change the default to a different Flash-tier
model if you want to try a newer one -- check current free-tier availability
at <https://ai.google.dev/gemini-api/docs/models> first, since that list
moves fast.

## Known limitations (prototype, not production)

- No retry/backoff on transient Gemini errors or rate-limit (429) responses.
- No rate limiting or request size limits beyond a coarse body-size cap.
- No automated tests hit the real Gemini API (per `docs/testing-strategy.md`'s
  "no real LLM calls" non-goal) -- `test/gemini-interpreter.test.ts` stubs both
  `fetch` and the rasterizer, and `server/index.mjs` itself is untested beyond
  manual smoke checks.
