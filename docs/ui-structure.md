# UI Structure

How the app's single HTML page (`index.html` + `src/main.ts`) is organized,
so a new feature lands in the right place instead of piling onto an already
crowded screen. This documents the *current* layout; see
`docs/prototype-scope.md` for the product-level scope it serves.

## Bottom navigation + three areas

The screen is a bottom tab bar (`#nav-tab-note` / `#nav-tab-notes` /
`#nav-tab-settings`) plus three mutually exclusive areas, switched by
`showTab()` in `src/main.ts`:

- **Notiz** (`#view-note`) -- the default, always-mounted view. Drawing
  canvas, edit tools, the interpret action, the result, and export. This is
  the only thing a first-time user sees.
- **Notizen** (`#sheet-notes`) -- the saved-notes list: search, status
  filter, per-note delete, workspace import/export.
- **Einstellungen** (`#sheet-settings`) -- Provider config (API key, model)
  and the mock/real-AI toggle.

Rule of thumb for new features: if it's something a user configures once
and rarely revisits, it belongs in a sheet, not in the Notiz view. If it's
part of the draw -> interpret -> export loop, it belongs in the Notiz view,
in the order below.

## Notiz view, top to bottom

1. Drawing canvas
2. Edit tools (Stift, Radierer, Rückgängig, Löschen) -- directly under the
   canvas, since they only make sense while drawing
3. The primary action (`#interpret-button`), visually set apart
   (highlighted, spaced) from the edit tools -- it's the one button that
   matters once the note is done
4. Result (`#result-section`, hidden until a Document has an
   interpretation) -- the Billable Data fields, front and center
5. Export (`#export-section`, hidden until a Document has an
   interpretation) -- one short explanatory sentence per export button,
   since the difference between "Bürotext", "Rechnungsvorbereitung", and
   "JSON" isn't obvious from the label alone

A new export format or a new primary action follows this same pattern:
gate its section on `effectiveInterpretation(document)` if it depends on
having a result, and give it a one-line explanation if its purpose isn't
self-evident from the button label.

## No separate "Speichern" step

There is no manual save button. `#interpret-button`'s click handler saves
the current canvas strokes as a new Document first (if any are unsaved),
then interprets that Document -- see the comment above that handler in
`src/main.ts`. Interpretation has always operated on a saved Document, not
on live canvas strokes, so this only removes a manual step; it doesn't
change what gets interpreted. A new feature that needs "the current note as
a Document" should call `getSelectedDocument()` after that auto-save, not
read canvas strokes directly.

## Loading state

`#interpret-loading` is a full-screen overlay toggled via
`interpretLoading.dataset.active`, shown for the duration of the
interpretation request. Any other long-running action started from the
Notiz view should use the same overlay rather than inventing a new
loading affordance.
