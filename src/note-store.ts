export interface RawNote {
  id: string;
  content: string;
  createdAt: string;
}

const LATEST_NOTE_KEY = "inknote:latest-note";

export function saveNote(note: RawNote): void {
  localStorage.setItem(LATEST_NOTE_KEY, JSON.stringify(note));
}

export function loadLatestNote(): RawNote | null {
  const raw = localStorage.getItem(LATEST_NOTE_KEY);
  return raw ? (JSON.parse(raw) as RawNote) : null;
}

export function clearSavedNote(): void {
  localStorage.removeItem(LATEST_NOTE_KEY);
}
