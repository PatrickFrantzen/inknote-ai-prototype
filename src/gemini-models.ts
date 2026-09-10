/**
 * Curated Gemini model choices for the Provider Settings dropdown, so a user
 * picks a known-good model ID instead of typing one that fails at the API
 * with an unclear error. Google's Gemini lineup moves fast (see
 * docs/agents/gemini-integration.md), so this list only includes models this
 * prototype has actually confirmed working -- update it as that changes.
 */
export interface GeminiModelOption {
  id: string;
  label: string;
}

export const CUSTOM_MODEL_OPTION = "__custom__";

export const KNOWN_GEMINI_MODELS: GeminiModelOption[] = [
  { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash (empfohlen, kostenloses Kontingent)" },
];
