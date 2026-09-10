import { saveDrawnNote } from "./app";
import type { CanvasTool, Stroke } from "./canvas-input";
import { attachCanvasInput } from "./canvas-input";
import type { BillableData } from "./billable-data";
import type { InternalDocumentEntry } from "./interpretation";
import { mockInterpreter } from "./interpretation";
import { describeJobError, sendForInterpretation } from "./manual-send";
import { reviewDocument } from "./review";
import { listDocuments } from "./note-store";
import type { Document } from "./note-store";
import { createGeminiInterpreter } from "./gemini-interpreter";
import { renderNoteImage } from "./note-image";

function loadLatestDocument(): Document | null {
  const documents = listDocuments();
  return documents.length === 0
    ? null
    : documents.reduce((latest, document) => (document.createdAt > latest.createdAt ? document : latest));
}

const geminiInterpreter = createGeminiInterpreter();
const useRealAiCheckbox = document.querySelector<HTMLInputElement>("#use-real-ai")!;

const drawingCanvas = document.querySelector<HTMLCanvasElement>("#drawing-canvas")!;
const previewCanvas = document.querySelector<HTMLCanvasElement>("#raw-note-preview")!;
const penButton = document.querySelector<HTMLButtonElement>("#pen-button")!;
const eraserButton = document.querySelector<HTMLButtonElement>("#eraser-button")!;
const undoButton = document.querySelector<HTMLButtonElement>("#undo-button")!;
const clearButton = document.querySelector<HTMLButtonElement>("#clear-button")!;
const saveButton = document.querySelector<HTMLButtonElement>("#save-button")!;
const interpretButton = document.querySelector<HTMLButtonElement>("#interpret-button")!;
const statusEl = document.querySelector<HTMLParagraphElement>("#status")!;
const entryEl = document.querySelector<HTMLDivElement>("#interpreted-entry")!;

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
  const note = loadLatestDocument();
  if (!note) {
    statusEl.textContent = "Noch keine gespeicherte Notiz.";
    return;
  }
  const strokes = JSON.parse(note.content) as Stroke[];
  renderNoteImageInto(previewCanvas, strokes);
  statusEl.textContent = `Gespeicherte Notiz vom ${new Date(note.createdAt).toLocaleString("de-DE")}.`;
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
  saveDrawnNote(strokes);
  renderSavedNotePreview();
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
      input.addEventListener("change", () => onChange(input.value));
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
  const document = loadLatestDocument();
  if (!document) {
    entryEl.textContent = "Keine gespeicherte Notiz zum Interpretieren.";
    return;
  }

  interpretButton.disabled = true;
  entryEl.textContent = "Wird interpretiert …";
  try {
    const adapter = useRealAiCheckbox.checked ? geminiInterpreter : mockInterpreter;
    const job = sendForInterpretation(document.id, adapter);
    const settled = await job.settled;
    if (settled.status === "completed" && settled.result) {
      renderEntry(document.id, settled.result);
    } else {
      const { message } = describeJobError(settled);
      entryEl.textContent = message;
    }
  } finally {
    interpretButton.disabled = false;
  }
});

renderSavedNotePreview();
