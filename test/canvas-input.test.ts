import { expect, test } from "vitest";
import { attachCanvasInput } from "../src/canvas-input";

function firePointerSequence(canvas: HTMLCanvasElement, points: [{ x: number; y: number }, ...Array<{ x: number; y: number }>]) {
  const [first, ...rest] = points;
  canvas.dispatchEvent(new MouseEvent("pointerdown", { clientX: first.x, clientY: first.y }));
  for (const point of rest) {
    canvas.dispatchEvent(new MouseEvent("pointermove", { clientX: point.x, clientY: point.y }));
  }
  canvas.dispatchEvent(new MouseEvent("pointerup"));
}

test("pointer input creates a drawable stroke from the recorded points", () => {
  const canvas = document.createElement("canvas");
  const input = attachCanvasInput(canvas);

  firePointerSequence(canvas, [
    { x: 0, y: 0 },
    { x: 5, y: 5 },
    { x: 10, y: 8 },
  ]);

  expect(input.getStrokes()).toEqual([
    [
      { x: 0, y: 0 },
      { x: 5, y: 5 },
      { x: 10, y: 8 },
    ],
  ]);
});

test("clearing removes the currently recorded strokes", () => {
  const canvas = document.createElement("canvas");
  const input = attachCanvasInput(canvas);

  firePointerSequence(canvas, [
    { x: 1, y: 1 },
    { x: 2, y: 2 },
  ]);
  input.clear();

  expect(input.getStrokes()).toEqual([]);
});
