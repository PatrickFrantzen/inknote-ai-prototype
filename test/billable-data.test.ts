import { expect, test } from "vitest";
import { parseDetectedNotes } from "../src/billable-data";
import { NonRetryableProviderError } from "../src/interpretation-job";



test("parses a fragmentary note that only has a transcription", () => {
  const raw = { notes: [{ transcription: "buy screws, call landlord" }] };

  expect(parseDetectedNotes(raw)).toEqual([{ billableData: { transcription: "buy screws, call landlord" } }]);
});

test("parses a note with every category present, including uncertainty", () => {
  const raw = {
    notes: [
      {
        customerDetails: { name: "Herr Müller", address: "Hauptstr. 1" },
        activity: "Ventil getauscht",
        materials: ["Dichtung", "Schraube M6"],
        quantityUnit: "2 Stück",
        time: "45 Minuten",
        estimate: "80 EUR",
        officeReminder: "Rechnung nachreichen",
        transcription: "Ventil kaputt, getauscht, 45min",
        uncertainty: ["estimate"],
      },
    ],
  };

  expect(parseDetectedNotes(raw)).toEqual([
    {
      billableData: {
        customerDetails: { name: "Herr Müller", address: "Hauptstr. 1" },
        activity: "Ventil getauscht",
        materials: ["Dichtung", "Schraube M6"],
        quantityUnit: "2 Stück",
        time: "45 Minuten",
        estimate: "80 EUR",
        officeReminder: "Rechnung nachreichen",
        transcription: "Ventil kaputt, getauscht, 45min",
        uncertainty: ["estimate"],
      },
    },
  ]);
});

test("rejects a response whose notes field is not an array", () => {
  expect(() => parseDetectedNotes({ notes: "not an array" })).toThrow(NonRetryableProviderError);
});

test("rejects a note whose materials field is not an array of strings", () => {
  const raw = { notes: [{ materials: "Dichtung" }] };

  expect(() => parseDetectedNotes(raw)).toThrow(NonRetryableProviderError);
});
