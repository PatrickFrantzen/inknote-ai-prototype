<!--
Notes on the real OpenAI integration added for the interpretation seam, for
whoever (human or agent) needs to run or extend it.
-->

# OpenAI integration

## Important: subscription vs. API billing

A ChatGPT Plus/Pro/Business subscription does **not** include OpenAI API access.
API usage is billed separately through <https://platform.openai.com>. Create an
API key at <https://platform.openai.com/settings/organization/api-keys> and make
sure billing/credits are set up there before testing this.

## Why there's a server now

OpenAI's own docs are explicit: an API key must never be exposed in client-side
code (browsers, apps) -- production requests must go through a backend that
loads the key from an environment variable. `docs/prototype-scope.md` otherwise
rules out a backend for this prototype; `server/index.mjs` is a narrow exception
that exists only to keep the key off the client. It has no persistence, auth, or
deployment story -- it is a local dev proxy, not a real backend.

## Setup

```bash
cp .env.example .env
# edit .env: paste your OPENAI_API_KEY
npm run server   # starts the proxy on http://localhost:8787
npm run dev      # starts the app; Vite proxies /api/* to the server above
```

Then tick "Echte OpenAI-Interpretation" in the UI before pressing "Interpretieren".
Untick it to fall back to the mocked interpreter without needing the server running.

## How it works

1. `src/canvas-input.ts` records the drawn strokes (point coordinates only).
2. `src/openai-interpreter.ts` (`createOpenAIInterpreter`) rasterizes those
   strokes onto an offscreen `<canvas>` to get a PNG data URL, then POSTs
   `{ noteId, imageDataUrl }` to `/api/interpret`.
3. `server/index.mjs` receives that request, calls the OpenAI Responses API
   (`POST https://api.openai.com/v1/responses`) with the image plus a
   German prompt asking for a structured internal document entry, and
   relays back `{ summary }`.
4. The client wraps that into an `InternalDocumentEntry` (see
   `src/interpretation.ts`) -- the same shape the mock interpreter produces,
   so the rest of the app (`src/app.ts`, `src/main.ts`) doesn't care which
   interpreter is active.

## Model

Configured via `OPENAI_MODEL` in `.env`, defaulting to `gpt-6-astra` (current
as of September 2026). It only just started rolling out at the time this was
written, so it may not yet be available on every account -- change
`OPENAI_MODEL` to whatever vision-capable model your account has access to if
you get a model-not-found style error.

## Known limitations (prototype, not production)

- No retry/backoff on transient OpenAI errors.
- No rate limiting or request size limits beyond a coarse body-size cap.
- No automated tests hit the real OpenAI API (per `docs/testing-strategy.md`'s
  "no real LLM calls" non-goal) -- `test/openai-interpreter.test.ts` stubs both
  `fetch` and the rasterizer, and `server/index.mjs` itself is untested beyond
  manual smoke checks.
