import { beforeEach, expect, test } from "vitest";
import { describeJobError, sendForInterpretation } from "../src/manual-send";
import { NonRetryableProviderError } from "../src/interpretation-job";
import { loadDocument, saveDocument } from "../src/note-store";
import type { ProviderAdapter, InternalDocumentEntry } from "../src/interpretation";

beforeEach(() => {
  localStorage.clear();
});

test("sending a document for interpretation is immediately running", () => {
  const document = saveDocument({ id: "doc-1", content: "buy screws", createdAt: "2026-01-01T10:00:00.000Z" });
  const neverSettles: ProviderAdapter = () => new Promise(() => {});

  const job = sendForInterpretation(document.id, neverSettles);

  expect(job.status).toBe("running");
});

test("on success, the document moves from scribbled to interpreted with the result persisted", async () => {
  const document = saveDocument({ id: "doc-2", content: "buy screws", createdAt: "2026-01-01T10:00:00.000Z" });
  const entry: InternalDocumentEntry = {
    noteId: "doc-2",
    notes: [{ billableData: { transcription: "buy screws" } }],
    createdAt: "2026-01-01T10:05:00.000Z",
  };
  const succeedingAdapter: ProviderAdapter = async () => entry;

  const job = sendForInterpretation(document.id, succeedingAdapter);
  await job.settled;

  expect(job.status).toBe("completed");
  expect(loadDocument(document.id)).toEqual({ ...document, status: "interpreted", interpretation: entry });
});

test("on failure, the document stays scribbled so it can be retried", async () => {
  const document = saveDocument({ id: "doc-3", content: "buy screws", createdAt: "2026-01-01T10:00:00.000Z" });
  const flakyAdapter: ProviderAdapter = async () => {
    throw new Error("network hiccup");
  };

  const job = sendForInterpretation(document.id, flakyAdapter);
  await job.settled;

  expect(job.status).toBe("retryable");
  expect(loadDocument(document.id)).toEqual(document);
});

test("retrying after a failure with a working adapter succeeds on the same document", async () => {
  const document = saveDocument({ id: "doc-4", content: "buy screws", createdAt: "2026-01-01T10:00:00.000Z" });
  const flakyAdapter: ProviderAdapter = async () => {
    throw new Error("network hiccup");
  };
  const firstJob = sendForInterpretation(document.id, flakyAdapter);
  await firstJob.settled;

  const entry: InternalDocumentEntry = {
    noteId: "doc-4",
    notes: [{ billableData: { transcription: "buy screws" } }],
    createdAt: "2026-01-01T10:05:00.000Z",
  };
  const workingAdapter: ProviderAdapter = async () => entry;
  const retryJob = sendForInterpretation(document.id, workingAdapter);
  await retryJob.settled;

  expect(retryJob.status).toBe("completed");
  expect(loadDocument(document.id)).toEqual({ ...document, status: "interpreted", interpretation: entry });
});

test("describes a retryable failure as something the user can retry", async () => {
  const document = saveDocument({ id: "doc-5", content: "buy screws", createdAt: "2026-01-01T10:00:00.000Z" });
  const flakyAdapter: ProviderAdapter = async () => {
    throw new Error("network hiccup");
  };
  const job = sendForInterpretation(document.id, flakyAdapter);
  await job.settled;

  expect(describeJobError(job)).toEqual({
    message: "Interpretation fehlgeschlagen (network hiccup). Bitte erneut versuchen.",
    canRetry: true,
  });
});

test("describes a non-retryable failure as needing attention, not a retry", async () => {
  const document = saveDocument({ id: "doc-6", content: "buy screws", createdAt: "2026-01-01T10:00:00.000Z" });
  const rejectingAdapter: ProviderAdapter = async () => {
    throw new NonRetryableProviderError("malformed provider response");
  };
  const job = sendForInterpretation(document.id, rejectingAdapter);
  await job.settled;

  expect(describeJobError(job)).toEqual({
    message: "Interpretation nicht möglich (malformed provider response). Bitte Einstellungen prüfen.",
    canRetry: false,
  });
});
