export interface ProviderSettings {
  apiKey: string;
  model: string;
}

const SETTINGS_KEY = "inknote:provider-settings";

export function saveProviderSettings(settings: ProviderSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadProviderSettings(): ProviderSettings | null {
  const raw = localStorage.getItem(SETTINGS_KEY);
  return raw ? (JSON.parse(raw) as ProviderSettings) : null;
}

/** Loads Provider Settings and validates them, throwing an understandable error instead of letting Manual Send fail with an incomplete request. */
export function requireProviderSettings(): ProviderSettings {
  const settings = loadProviderSettings();
  if (!settings?.apiKey || !settings.model) {
    throw new Error("Provider Settings fehlen oder sind unvollständig. Bitte API-Key und Modell in den Einstellungen hinterlegen.");
  }
  return settings;
}
