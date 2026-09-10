import { expect, test } from "vitest";
import { renderNoteImage } from "../src/note-image";
import type { Stroke } from "../src/canvas-input";

function createFakeCanvas() {
  const calls: string[] = [];
  const context = {
    fillStyle: "",
    lineWidth: 0,
    lineCap: "",
    strokeStyle: "",
    fillRect: (...args: number[]) => calls.push(`fillRect(${args.join(",")})`),
    beginPath: () => calls.push("beginPath()"),
    moveTo: (x: number, y: number) => calls.push(`moveTo(${x},${y})`),
    lineTo: (x: number, y: number) => calls.push(`lineTo(${x},${y})`),
    stroke: () => calls.push("stroke()"),
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => context,
    toDataURL: () => "data:image/png;base64,FAKE",
  } as unknown as HTMLCanvasElement;

  return { canvas, calls };
}

test("renders each stroke's points as a path and returns the canvas data URL", () => {
  const { canvas, calls } = createFakeCanvas();
  const strokes: Stroke[] = [
    [
      { x: 0, y: 0 },
      { x: 5, y: 5 },
    ],
    [{ x: 20, y: 20 }],
  ];

  const dataUrl = renderNoteImage(strokes, () => canvas);

  expect(dataUrl).toBe("data:image/png;base64,FAKE");
  expect(calls).toEqual([
    "fillRect(0,0,800,320)",
    "beginPath()",
    "moveTo(0,0)",
    "lineTo(5,5)",
    "stroke()",
    "beginPath()",
    "moveTo(20,20)",
    "stroke()",
  ]);
});

test("rendering no strokes still returns a data URL for a blank image", () => {
  const { canvas } = createFakeCanvas();

  expect(renderNoteImage([], () => canvas)).toBe("data:image/png;base64,FAKE");
});
