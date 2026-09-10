import type { InterpretationJob } from "./interpretation-job";
import { startInterpretationJob } from "./interpretation-job";
import type { ProviderAdapter } from "./interpretation";
import { loadDocument, saveInterpretation } from "./note-store";

/** Starts the Interpretation Job for a Document's Raw Note. The Document's status only moves to "interpreted" on success; a failed/retryable job leaves it "scribbled" so retrying is just calling this again. */
export function sendForInterpretation(documentId: string, adapter: ProviderAdapter): InterpretationJob {
  const document = loadDocument(documentId);
  if (!document) throw new Error(`Cannot send for interpretation: document ${documentId} not found`);
  if (document.status === "exported") {
    throw new Error(`Cannot rerun interpretation: document ${documentId} has already been exported`);
  }

  const job = startInterpretationJob(adapter, document);

  void job.settled.then((settledJob) => {
    if (settledJob.status === "completed" && settledJob.result) {
      saveInterpretation(documentId, settledJob.result);
    }
  });

  return job;
}

export interface JobErrorDescription {
  message: string;
  canRetry: boolean;
}

/** Maps a settled, unsuccessful Interpretation Job to an understandable message: retry, or check settings. */
export function describeJobError(job: InterpretationJob): JobErrorDescription {
  if (job.status === "retryable") {
    return { message: `Interpretation fehlgeschlagen (${job.errorMessage}). Bitte erneut versuchen.`, canRetry: true };
  }
  return { message: `Interpretation nicht möglich (${job.errorMessage}). Bitte Einstellungen prüfen.`, canRetry: false };
}
