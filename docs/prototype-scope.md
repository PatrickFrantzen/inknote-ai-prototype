# Prototype Scope

## Working name

InkNote AI Prototype

## Problem

Mobile workers often capture quick, messy notes while away from the office. These notes later need to become usable internal documentation, but rewriting them manually costs time and loses context.

## Target users

The first prototype is not tied to one trade. The intended users are people who work on-site or on the road and need quick note capture, for example:

- tradespeople
- service technicians
- installers
- maintenance workers
- site workers
- field staff

## Core workflow

1. User opens a tablet-friendly PWA.
2. User writes a note by hand on the display using a stylus.
3. The app stores the handwritten note locally.
4. Later, when the user has good connectivity, they manually triggers AI interpretation.
5. The app interprets the note into a structured internal document entry.
6. The resulting text can be used for further processing outside the prototype.

## First prototype goal

Prove the smallest useful demo:

> A handwritten note on a tablet display can be captured, saved, and interpreted into a useful structured internal document entry.

## In scope for Prototype 1

- Simple tablet-friendly HTML interface
- Canvas-based handwriting area
- Pointer Events for stylus/touch/mouse input
- Local save using LocalStorage
- Mocked AI interpretation result, with a toggle to switch to a real Gemini interpretation
- Real Gemini (`gemini-2.5-flash`) vision interpretation, via a minimal local proxy server
  that holds the API key server-side (see `docs/agents/gemini-integration.md`) -- chosen
  for its genuinely free tier, since a ChatGPT Plus/Pro subscription does not cover
  OpenAI API usage
- Display of original handwritten note and interpreted document entry
- Clear separation between raw handwritten note and interpreted output

## Out of scope for Prototype 1

- User accounts
- Real provider login
- Real OpenAI/Anthropic/other-LLM integration (Gemini is now integrated, see above)
- A production backend (the local proxy server exists only to keep the Gemini key
  off the client; it has no persistence, auth, or deployment story)
- Database
- Cloud sync
- Offline sync beyond simple local save
- Billing
- Teams or multi-user organizations
- Production-grade security
- Export integrations
- Native app packaging

## Later exploration

After the mock workflow feels right, evaluate how to turn handwriting into useful text/structure:

- OCR first, LLM second (the current approach sends the raw drawing straight to a vision model)
- provider options beyond Gemini, such as OpenAI, Anthropic, or local models
- local-first storage options such as IndexedDB
- a real deployment story for the interpretation server (currently a local-only dev proxy)

## Product assumptions for now

- Users decide when a note is sent to AI.
- Notes stay local until the user presses an interpretation/sync action.
- The first output type is a generic internal document entry, not an invoice, official report, or customer-facing document.
- The first version is an experiment, not a production product.
