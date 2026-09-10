import { interpretLatestNote, saveDrawnNote } from "./app";
import type { CanvasTool, Stroke } from "./canvas-input";
import { attachCanvasInput } from "./canvas-input";
import type { InternalDocumentEntry } from "./interpretation";
import { mockInterpreter } from "./interpretation";
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

function renderEntry(entry: InternalDocumentEntry) {
  entryEl.innerHTML = "";
  for (const note of entry.notes) {
    const heading = document.createElement("h3");
    heading.textContent = note.heading;
    entryEl.appendChild(heading);

    const list = document.createElement("ul");
    for (const bullet of note.bullets) {
      const item = document.createElement("li");
      item.textContent = bullet;
      list.appendChild(item);
    }
    entryEl.appendChild(list);
  }
}

interpretButton.addEventListener("click", async () => {
  interpretButton.disabled = true;
  entryEl.textContent = "Wird interpretiert …";
  try {
    const interpreter = useRealAiCheckbox.checked ? geminiInterpreter : mockInterpreter;
    const entry = await interpretLatestNote(interpreter);
    if (entry) {
      renderEntry(entry);
    } else {
      entryEl.textContent = "Keine gespeicherte Notiz zum Interpretieren.";
    }
  } catch (error) {
    entryEl.textContent = `Interpretation fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    interpretButton.disabled = false;
  }
});

renderSavedNotePreview();
