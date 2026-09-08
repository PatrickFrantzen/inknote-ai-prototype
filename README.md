# InkNote AI Prototype

A prototype for testing whether handwritten tablet notes can be captured, stored locally, and later interpreted by AI into structured internal documents for further processing.

## Status

Prototype planning only. No application code has been written yet.

## Core idea

People working in the field — especially tradespeople, technicians, installers, site workers, and similar mobile roles — often need to capture quick notes while away from the office. This prototype explores a tablet-first workflow where users write notes by hand with a stylus, save them locally, and later send them to an LLM provider of their choice when they have a reliable connection.

## Prototype question

Can a user write a handwritten note on a tablet display and get a useful AI interpretation as a structured internal document entry?

## Initial technology direction

- App type: PWA / web app
- Language: TypeScript
- UI: simple HTML first
- Input: HTML Canvas with Pointer Events for stylus/touch/mouse
- Storage: LocalStorage for the first prototype
- AI: mock interpretation first, then evaluate real LLM/vision options
- Development approach: test-driven development using the Matt Pocock TDD skill

## Current scope

See [`docs/prototype-scope.md`](docs/prototype-scope.md).

## Testing approach

See [`docs/testing-strategy.md`](docs/testing-strategy.md).
