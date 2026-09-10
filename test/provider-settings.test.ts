import { beforeEach, expect, test } from "vitest";
import { loadProviderSettings, requireProviderSettings, saveProviderSettings } from "../src/provider-settings";


beforeEach(() => {
  localStorage.clear();
});

test("saving provider settings makes them loadable", () => {
  saveProviderSettings({ apiKey: "secret-key", model: "gemini-3.6-flash" });

  expect(loadProviderSettings()).toEqual({ apiKey: "secret-key", model: "gemini-3.6-flash" });
});

test("loading with nothing saved yet returns null", () => {
  expect(loadProviderSettings()).toBeNull();
});

test("requiring provider settings throws an understandable error when nothing is saved", () => {
  expect(() => requireProviderSettings()).toThrow(/Provider Settings fehlen/);
});

test("requiring provider settings throws when the api key is empty", () => {
  saveProviderSettings({ apiKey: "", model: "gemini-3.6-flash" });

  expect(() => requireProviderSettings()).toThrow(/Provider Settings fehlen/);
});

test("requiring provider settings throws when the model is empty", () => {
  saveProviderSettings({ apiKey: "secret-key", model: "" });

  expect(() => requireProviderSettings()).toThrow(/Provider Settings fehlen/);
});

test("requiring provider settings returns them when valid", () => {
  saveProviderSettings({ apiKey: "secret-key", model: "gemini-3.6-flash" });

  expect(requireProviderSettings()).toEqual({ apiKey: "secret-key", model: "gemini-3.6-flash" });
});
