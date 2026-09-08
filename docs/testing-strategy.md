# Testing Strategy

This project will be developed test-first.

## TDD rule

No production application code should be written without a failing test first.

The project follows the Matt Pocock TDD skill:

1. Agree the public seam under test.
2. Write one failing test for one behavior.
3. Run the test and verify the expected failure.
4. Write the minimum implementation to pass.
5. Run the test and verify it passes.
6. Run the relevant full test suite.
7. Repeat in small vertical slices.

## Initial seams to confirm before coding

No tests or production code have been created yet. Before implementation starts, confirm the seams.

Likely first seams:

### Canvas input seam

Public behavior to test:

- pointer input creates drawable strokes
- clearing removes current strokes
- saved note image/state represents the current canvas content

### Local note storage seam

Public behavior to test:

- saving a note persists it locally
- loading restores the latest saved note
- clearing current canvas does not accidentally delete saved notes unless explicitly requested

### Interpretation seam

Public behavior to test:

- pressing interpret sends the saved/raw note to an interpreter interface
- mock interpreter returns a structured internal document entry
- the UI renders the interpreted entry separately from the raw note

## First vertical slice candidate

A minimal end-to-end behavior:

> A user draws a handwritten note on the canvas, saves it locally, presses interpret, and sees a mocked structured internal document entry.

This slice should remain mock-based until the UI and local workflow are validated.

## Explicit non-goals for first tests

- no real LLM calls
- no real authentication
- no provider API key handling
- no backend integration
- no visual pixel-perfect canvas assertions unless absolutely necessary
