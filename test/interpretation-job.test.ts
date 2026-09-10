import { expect, test } from "vitest";
import { NonRetryableProviderError, startInterpretationJob } from "../src/interpretation-job";
import type { ProviderAdapter, InternalDocumentEntry } from "../src/interpretation";
import type { RawNote } from "../src/note-store";

const note: RawNote = { id: "note-1", content: "buy screws", createdAt: "2026-01-01T10:00:00.000Z" };

test("a started job is immediately running", () => {
  const neverSettles: ProviderAdapter = () => new Promise(() => {});

  const job = startInterpretationJob(neverSettles, note);

  expect(job.status).toBe("running");
});

test("a job completes with the adapter's result on success", async () => {
  const entry: InternalDocumentEntry = { noteId: "note-1", notes: [], createdAt: "2026-01-01T10:00:01.000Z" };
  const succeedingAdapter: ProviderAdapter = async () => entry;

  const job = startInterpretationJob(succeedingAdapter, note);
  await job.settled;

  expect(job.status).toBe("completed");
  expect(job.result).toEqual(entry);
});

test("a job becomes retryable when the adapter throws an ordinary error", async () => {
  const flakyAdapter: ProviderAdapter = async () => {
    throw new Error("network hiccup");
  };

  const job = startInterpretationJob(flakyAdapter, note);
  await job.settled;

  expect(job.status).toBe("retryable");
  expect(job.result).toBeNull();
  expect(job.errorMessage).toBe("network hiccup");
});

test("a job fails without retry when the adapter signals a non-retryable error", async () => {
  const rejectingAdapter: ProviderAdapter = async () => {
    throw new NonRetryableProviderError("malformed provider response");
  };

  const job = startInterpretationJob(rejectingAdapter, note);
  await job.settled;

  expect(job.status).toBe("failed");
  expect(job.errorMessage).toBe("malformed provider response");
});
