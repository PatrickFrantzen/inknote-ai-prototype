import { saveDrawnNote } from "./app";
import type { CanvasTool, Stroke } from "./canvas-input";
import { attachCanvasInput } from "./canvas-input";
import type { BillableData } from "./billable-data";
import type { InternalDocumentEntry } from "./interpretation";
import { mockInterpreter } from "./interpretation";
import { describeJobError, sendForInterpretation } from "./manual-send";
import { effectiveInterpretation, reviewDocument } from "./review";
import { approveDocument, exportWorkspace, importWorkspace, listDocuments, loadDocument } from "./note-store";
import type { WorkspaceExport } from "./note-store";
import type { Document, DocumentStatus } from "./note-store";
import { createGeminiInterpreter } from "./gemini-interpreter";
import { renderNoteImage } from "./note-image";
import { exportDocument, toInvoicePreparationText, toOfficeText, toVersionedJson } from "./export";
import { documentSearchSnippet, filterDocuments } from "./document-list";
import { loadProviderSettings, saveProviderSettings } from "./provider-settings";
import { CUSTOM_MODEL_OPTION, KNOWN_GEMINI_MODELS } from "./gemini-models";

function loadLatestDocument(): Document | null {
  const documents = listDocuments();
  return documents.length === 0
    ? null
    : documents.reduce((latest, document) => (document.createdAt > latest.createdAt ? document : latest));
}

let selectedDocumentId: string | null = null;

/** The Document the rest of the app (canvas preview, review, approve, export) operates on: the one explicitly picked from the list, falling back to the most-recently-created Document when nothing has been picked yet. */
function getSelectedDocument(): Document | null {
  if (selectedDocumentId) {
    const selected = loadDocument(selectedDocumentId);
    if (selected) return selected;
  }
  return loadLatestDocument();
}

const useRealAiCheckbox = document.querySelector<HTMLInputElement>("#use-real-ai")!;

function currentAdapter() {
  if (!useRealAiCheckbox.checked) return mockInterpreter;
  // Provider Settings are optional here: when unset (or partially unset), the proxy
  // falls back to its own GEMINI_API_KEY/GEMINI_MODEL env vars (see server/index.mjs),
  // so the app works out of the box while still letting a user bring their own key/model.
  return createGeminiInterpreter({ settings: loadProviderSettings() ?? undefined });
}

const drawingCanvas = document.querySelector<HTMLCanvasElement>("#drawing-canvas")!;
const previewCanvas = document.querySelector<HTMLCanvasElement>("#raw-note-preview")!;
const penButton = document.querySelector<HTMLButtonElement>("#pen-button")!;
const eraserButton = document.querySelector<HTMLButtonElement>("#eraser-button")!;
const undoButton = document.querySelector<HTMLButtonElement>("#undo-button")!;
const clearButton = document.querySelector<HTMLButtonElement>("#clear-button")!;
const saveButton = document.querySelector<HTMLButtonElement>("#save-button")!;
const interpretButton = document.querySelector<HTMLButtonElement>("#interpret-button")!;
const approveButton = document.querySelector<HTMLButtonElement>("#approve-button")!;
const exportOfficeButton = document.querySelector<HTMLButtonElement>("#export-office-button")!;
const exportInvoiceButton = document.querySelector<HTMLButtonElement>("#export-invoice-button")!;
const exportJsonButton = document.querySelector<HTMLButtonElement>("#export-json-button")!;
const exportOutputEl = document.querySelector<HTMLTextAreaElement>("#export-output")!;
const copyExportButton = document.querySelector<HTMLButtonElement>("#copy-export-button")!;
const downloadJsonButton = document.querySelector<HTMLButtonElement>("#download-json-button")!;
const statusEl = document.querySelector<HTMLParagraphElement>("#status")!;
const entryEl = document.querySelector<HTMLDivElement>("#interpreted-entry")!;
const providerApiKeyInput = document.querySelector<HTMLInputElement>("#provider-api-key")!;
const providerModelSelect = document.querySelector<HTMLSelectElement>("#provider-model")!;
const providerModelCustomInput = document.querySelector<HTMLInputElement>("#provider-model-custom")!;
const saveSettingsButton = document.querySelector<HTMLButtonElement>("#save-settings-button")!;
const documentListEl = document.querySelector<HTMLUListElement>("#document-list")!;
const exportWorkspaceButton = document.querySelector<HTMLButtonElement>("#export-workspace-button")!;
const importWorkspaceInput = document.querySelector<HTMLInputElement>("#import-workspace-input")!;
const documentSearchInput = document.querySelector<HTMLInputElement>("#document-search")!;
const statusFilterEl = document.querySelector<HTMLDivElement>("#status-filter")!;
const statusFilterCheckboxes = Array.from(statusFilterEl.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));

function matchCanvasSizeToDisplay(canvas: HTMLCanvasElement) {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}

matchCanvasSizeToDisplay(drawingCanvas);
matchCanvasSizeToDisplay(previewCanvas);

function drawStroke(context: CanvasRenderingContext2D, stroke: Stroke) {
  const [first, ...rest] = stroke;
  if (!first) return;
  context.beginPath();
  context.moveTo(first.x, first.y);
  for (const point of rest) {
    context.lineTo(point.x, point.y);
  }
  context.stroke();
}

function drawStrokes(canvas: HTMLCanvasElement, strokes: Stroke[]) {
  const context = canvas.getContext("2d")!;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.lineWidth = 2;
  context.lineCap = "round";
  context.strokeStyle = "#1c1917";
  for (const stroke of strokes) {
    drawStroke(context, stroke);
  }
}

const input = attachCanvasInput(drawingCanvas);

function redrawDrawingCanvas() {
  drawStrokes(drawingCanvas, input.getStrokes());
}

drawingCanvas.addEventListener("pointermove", redrawDrawingCanvas);
drawingCanvas.addEventListener("pointerdown", redrawDrawingCanvas);

function setActiveTool(tool: CanvasTool) {
  input.setTool(tool);
  penButton.setAttribute("aria-pressed", String(tool === "pen"));
  eraserButton.setAttribute("aria-pressed", String(tool === "eraser"));
}

penButton.addEventListener("click", () => setActiveTool("pen"));
eraserButton.addEventListener("click", () => setActiveTool("eraser"));
undoButton.addEventListener("click", () => {
  input.undo();
  redrawDrawingCanvas();
});

// Renders the same Note Image (Stroke Data -> raster) that the Provider Adapter sends,
// so the preview shown here is exactly what interpretation is based on.
function renderNoteImageInto(canvas: HTMLCanvasElement, strokes: Stroke[]) {
  const context = canvas.getContext("2d")!;
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (strokes.length === 0) return;
  const image = new Image();
  image.onload = () => context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.src = renderNoteImage(strokes);
}

function renderSavedNotePreview() {
  const note = getSelectedDocument();
  if (!note) {
    statusEl.textContent = "Noch keine gespeicherte Notiz.";
    entryEl.textContent = "Noch keine Interpretation.";
    return;
  }
  const strokes = JSON.parse(note.content) as Stroke[];
  renderNoteImageInto(previewCanvas, strokes);
  statusEl.textContent = `Gespeicherte Notiz vom ${new Date(note.createdAt).toLocaleString("de-DE")} (${note.status}).`;
  const effective = effectiveInterpretation(note);
  if (effective) {
    renderEntry(note.id, effective);
  } else {
    entryEl.textContent = "Noch keine Interpretation.";
  }
}

function currentStatusFilter(): DocumentStatus[] {
  return statusFilterCheckboxes.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value as DocumentStatus);
}

function renderDocumentList() {
  const filtered = filterDocuments(listDocuments(), {
    query: documentSearchInput.value,
    statuses: currentStatusFilter(),
  });
  const selected = getSelectedDocument();

  documentListEl.innerHTML = "";
  for (const doc of filtered) {
    const item = document.createElement("li");
    item.setAttribute("aria-selected", String(doc.id === selected?.id));
    const timestamp = document.createElement("span");
    timestamp.textContent = new Date(doc.createdAt).toLocaleString("de-DE");
    const status = document.createElement("span");
    status.className = "doc-status";
    status.textContent = doc.status;
    const snippet = document.createElement("span");
    snippet.className = "doc-snippet";
    const text = documentSearchSnippet(doc);
    snippet.textContent = text ? text.slice(0, 40) : "Keine Interpretation";
    item.append(timestamp, status, snippet);
    item.addEventListener("click", () => selectDocument(doc.id));
    documentListEl.appendChild(item);
  }
}

function selectDocument(id: string) {
  selectedDocumentId = id;
  renderSavedNotePreview();
  renderDocumentList();
}

documentSearchInput.addEventListener("input", renderDocumentList);
for (const checkbox of statusFilterCheckboxes) {
  checkbox.addEventListener("change", renderDocumentList);
}

clearButton.addEventListener("click", () => {
  input.clear();
  redrawDrawingCanvas();
});

saveButton.addEventListener("click", () => {
  const strokes = input.getStrokes();
  if (strokes.length === 0) {
    statusEl.textContent = "Erst etwas zeichnen, dann speichern.";
    return;
  }
  const saved = saveDrawnNote(strokes);
  selectedDocumentId = saved.id;
  renderSavedNotePreview();
  renderDocumentList();
});

const BILLABLE_DATA_LABELS: Record<keyof Omit<BillableData, "customerDetails" | "uncertainty">, string> = {
  activity: "Tätigkeit",
  materials: "Material",
  quantityUnit: "Menge/Einheit",
  time: "Zeit",
  estimate: "Schätzung",
  officeReminder: "Büro-Hinweis",
  transcription: "Transkription",
};

// The Review UI: Note Image is already shown in the preview panel (same Document); this
// renders each Detected Note's present Billable Data as editable fields next to it. Empty
// categories are skipped here but stay present-as-absent in the underlying structured data.
// Uncertain fields are marked "(unsicher)". Edits are saved as the Reviewed Interpretation.
function renderEntry(documentId: string, entry: InternalDocumentEntry) {
  entryEl.innerHTML = "";
  entry.notes.forEach((note, noteIndex) => {
    const heading = document.createElement("h3");
    heading.textContent = `Notiz ${noteIndex + 1}`;
    entryEl.appendChild(heading);

    const fields = document.createElement("div");
    fields.className = "billable-data-fields";
    const { billableData } = note;
    const uncertain = new Set(billableData.uncertainty ?? []);

    function addRow(labelText: string, value: string, onChange: (value: string) => void) {
      const row = document.createElement("label");
      row.className = "billable-data-field";
      const labelEl = document.createElement("span");
      labelEl.textContent = labelText;
      const input = document.createElement("input");
      input.type = "text";
      input.value = value;
      input.addEventListener("change", () => {
        onChange(input.value);
        renderDocumentList();
      });
      row.appendChild(labelEl);
      row.appendChild(input);
      fields.appendChild(row);
    }

    if (billableData.customerDetails?.name || billableData.customerDetails?.address) {
      const label = uncertain.has("customerDetails") ? "Kunde (unsicher)" : "Kunde";
      addRow(label, [billableData.customerDetails.name, billableData.customerDetails.address].filter(Boolean).join(", "), (value) => {
        const [name, address] = value.split(",").map((part) => part.trim());
        reviewDocument(documentId, noteIndex, { customerDetails: { name: name || undefined, address: address || undefined } });
      });
    }

    for (const [field, label] of Object.entries(BILLABLE_DATA_LABELS) as Array<[keyof typeof BILLABLE_DATA_LABELS, string]>) {
      const value = billableData[field];
      if (!value) continue;
      const labelText = uncertain.has(field) ? `${label} (unsicher)` : label;
      if (Array.isArray(value)) {
        addRow(labelText, value.join(", "), (next) => {
          reviewDocument(documentId, noteIndex, { [field]: next.split(",").map((part) => part.trim()).filter(Boolean) });
        });
      } else {
        addRow(labelText, value, (next) => {
          reviewDocument(documentId, noteIndex, { [field]: next });
        });
      }
    }

    entryEl.appendChild(fields);
  });
}

interpretButton.addEventListener("click", async () => {
  const document = getSelectedDocument();
  if (!document) {
    entryEl.textContent = "Keine gespeicherte Notiz zum Interpretieren.";
    return;
  }
  if (document.reviewedInterpretation) {
    const confirmed = window.confirm("Erneutes Interpretieren ersetzt deine bisherigen Änderungen. Fortfahren?");
    if (!confirmed) return;
  }

  interpretButton.disabled = true;
  entryEl.textContent = "Wird interpretiert …";
  try {
    const adapter = currentAdapter();
    const job = sendForInterpretation(document.id, adapter);
    const settled = await job.settled;
    if (settled.status === "completed" && settled.result) {
      renderEntry(document.id, settled.result);
      statusEl.textContent = "Interpretiert. Bitte prüfen und freigeben.";
    } else {
      const { message } = describeJobError(settled);
      entryEl.textContent = message;
    }
  } catch (error) {
    entryEl.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    interpretButton.disabled = false;
    renderDocumentList();
  }
});

approveButton.addEventListener("click", () => {
  const document = getSelectedDocument();
  if (!document) {
    statusEl.textContent = "Keine gespeicherte Notiz zum Freigeben.";
    return;
  }
  try {
    approveDocument(document.id);
    statusEl.textContent = "Freigegeben.";
  } catch (error) {
    statusEl.textContent = error instanceof Error ? error.message : String(error);
  }
  renderDocumentList();
});

let currentJsonExport: string | null = null;

function withExportableDocument(action: (document: Document) => void) {
  const document = getSelectedDocument();
  if (!document) {
    statusEl.textContent = "Keine gespeicherte Notiz zum Exportieren.";
    return;
  }
  if (!effectiveInterpretation(document)) {
    statusEl.textContent = "Erst interpretieren, bevor exportiert werden kann.";
    return;
  }
  try {
    action(document);
  } catch (error) {
    statusEl.textContent = error instanceof Error ? error.message : String(error);
  }
  renderDocumentList();
}

exportOfficeButton.addEventListener("click", () => {
  withExportableDocument((document) => {
    const exported = exportDocument(document.id);
    exportOutputEl.value = toOfficeText(effectiveInterpretation(exported)!);
    downloadJsonButton.hidden = true;
    currentJsonExport = null;
    statusEl.textContent = "Exportiert (Bürotext).";
  });
});

exportInvoiceButton.addEventListener("click", () => {
  withExportableDocument((document) => {
    const exported = exportDocument(document.id);
    exportOutputEl.value = toInvoicePreparationText(effectiveInterpretation(exported)!);
    downloadJsonButton.hidden = true;
    currentJsonExport = null;
    statusEl.textContent = "Exportiert (Rechnungsvorbereitung).";
  });
});

exportJsonButton.addEventListener("click", () => {
  withExportableDocument((document) => {
    const exported = exportDocument(document.id);
    const json = JSON.stringify(toVersionedJson(effectiveInterpretation(exported)!), null, 2);
    exportOutputEl.value = json;
    currentJsonExport = json;
    downloadJsonButton.hidden = false;
    statusEl.textContent = "Exportiert (JSON).";
  });
});

copyExportButton.addEventListener("click", async () => {
  if (!exportOutputEl.value) return;
  await navigator.clipboard.writeText(exportOutputEl.value);
  statusEl.textContent = "In Zwischenablage kopiert.";
});

downloadJsonButton.addEventListener("click", () => {
  if (!currentJsonExport) return;
  const blob = new Blob([currentJsonExport], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "inknote-export.json";
  link.click();
  URL.revokeObjectURL(url);
});

// "Server-Standard" is an empty model value, so the server falls back to its own
// GEMINI_MODEL env var (see currentAdapter() above and server/index.mjs).
providerModelSelect.appendChild(new Option("Server-Standard verwenden", ""));
for (const { id, label } of KNOWN_GEMINI_MODELS) {
  providerModelSelect.appendChild(new Option(label, id));
}
providerModelSelect.appendChild(new Option("Anderes Modell (manuell eingeben)...", CUSTOM_MODEL_OPTION));

function currentModelValue(): string {
  return providerModelSelect.value === CUSTOM_MODEL_OPTION
    ? providerModelCustomInput.value.trim()
    : providerModelSelect.value;
}

providerModelSelect.addEventListener("change", () => {
  providerModelCustomInput.style.display = providerModelSelect.value === CUSTOM_MODEL_OPTION ? "" : "none";
});

saveSettingsButton.addEventListener("click", () => {
  saveProviderSettings({ apiKey: providerApiKeyInput.value.trim(), model: currentModelValue() });
  statusEl.textContent = "Provider Settings gespeichert.";
});

const existingSettings = loadProviderSettings();
if (existingSettings) {
  providerApiKeyInput.value = existingSettings.apiKey;
  const isKnownModel = KNOWN_GEMINI_MODELS.some(({ id }) => id === existingSettings.model);
  if (existingSettings.model && !isKnownModel) {
    providerModelSelect.value = CUSTOM_MODEL_OPTION;
    providerModelCustomInput.value = existingSettings.model;
    providerModelCustomInput.style.display = "";
  } else {
    providerModelSelect.value = existingSettings.model;
  }
}

exportWorkspaceButton.addEventListener("click", () => {
  const json = JSON.stringify(exportWorkspace(), null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `inknote-workspace-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

importWorkspaceInput.addEventListener("change", async () => {
  const file = importWorkspaceInput.files?.[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text()) as WorkspaceExport;
    const { imported, skipped } = importWorkspace(data);
    statusEl.textContent = `Workspace importiert: ${imported} übernommen, ${skipped} übersprungen (bereits vorhanden).`;
    renderDocumentList();
  } catch (error) {
    statusEl.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    importWorkspaceInput.value = "";
  }
});

renderSavedNotePreview();
renderDocumentList();
