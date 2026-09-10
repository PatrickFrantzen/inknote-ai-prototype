import { NonRetryableProviderError } from "./interpretation-job";

export interface CustomerDetails {
  name?: string;
  address?: string;
}

/** All categories are optional: a fragmentary Handwritten Note is a valid, useful result. */
export interface BillableData {
  customerDetails?: CustomerDetails;
  activity?: string;
  materials?: string[];
  quantityUnit?: string;
  time?: string;
  estimate?: string;
  officeReminder?: string;
  transcription?: string;
  /** Names of the categories above the Provider was not confident about. */
  uncertainty?: string[];
}

export interface DetectedNote {
  billableData: BillableData;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function malformed(message: string): never {
  throw new NonRetryableProviderError(`Malformed Provider response: ${message}`);
}

function parseOptionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (!isString(value)) malformed(`expected "${field}" to be a string`);
  return value;
}

function parseOptionalStringArray(value: unknown, field: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || !value.every(isString)) malformed(`expected "${field}" to be an array of strings`);
  return value;
}

function parseOptionalCustomerDetails(value: unknown, field: string): CustomerDetails | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "object" || value === null) malformed(`expected "${field}" to be an object`);
  const details = value as Record<string, unknown>;
  return {
    name: parseOptionalString(details.name, `${field}.name`),
    address: parseOptionalString(details.address, `${field}.address`),
  };
}

function parseBillableData(raw: unknown, index: number): BillableData {
  if (typeof raw !== "object" || raw === null) malformed(`notes[${index}] is not an object`);
  const note = raw as Record<string, unknown>;
  const prefix = `notes[${index}]`;

  return {
    customerDetails: parseOptionalCustomerDetails(note.customerDetails, `${prefix}.customerDetails`),
    activity: parseOptionalString(note.activity, `${prefix}.activity`),
    materials: parseOptionalStringArray(note.materials, `${prefix}.materials`),
    quantityUnit: parseOptionalString(note.quantityUnit, `${prefix}.quantityUnit`),
    time: parseOptionalString(note.time, `${prefix}.time`),
    estimate: parseOptionalString(note.estimate, `${prefix}.estimate`),
    officeReminder: parseOptionalString(note.officeReminder, `${prefix}.officeReminder`),
    transcription: parseOptionalString(note.transcription, `${prefix}.transcription`),
    uncertainty: parseOptionalStringArray(note.uncertainty, `${prefix}.uncertainty`),
  };
}

export function parseDetectedNotes(raw: unknown): DetectedNote[] {
  if (typeof raw !== "object" || raw === null) malformed("response is not an object");
  const { notes } = raw as Record<string, unknown>;
  if (!Array.isArray(notes)) malformed('"notes" is not an array');

  return notes.map((note, index) => ({ billableData: parseBillableData(note, index) }));
}
