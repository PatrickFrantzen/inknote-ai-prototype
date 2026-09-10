import type { InternalDocumentEntry, ProviderAdapter } from "./interpretation";
import type { RawNote } from "./note-store";

export type InterpretationJobStatus = "running" | "completed" | "failed" | "retryable";

export interface InterpretationJob {
  status: InterpretationJobStatus;
  result: InternalDocumentEntry | null;
  errorMessage: string | null;
  /** Resolves once the job leaves "running", with this same job object updated in place. */
  settled: Promise<InterpretationJob>;
}

/** A Provider Adapter throws this to signal a failure that retrying won't fix (e.g. malformed output). Anything else is assumed retryable. */
export class NonRetryableProviderError extends Error {}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function startInterpretationJob(adapter: ProviderAdapter, note: RawNote): InterpretationJob {
  const job: InterpretationJob = {
    status: "running",
    result: null,
    errorMessage: null,
    settled: null as unknown as Promise<InterpretationJob>,
  };

  job.settled = adapter(note).then(
    (result) => {
      job.status = "completed";
      job.result = result;
      return job;
    },
    (error: unknown) => {
      job.status = error instanceof NonRetryableProviderError ? "failed" : "retryable";
      job.errorMessage = describe(error);
      return job;
    },
  );

  return job;
}
