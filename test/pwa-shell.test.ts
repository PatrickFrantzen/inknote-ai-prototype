import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";

const testDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(testDir, "..");
const distDir = resolve(rootDir, "dist");

describe("PWA shell build output", () => {
  beforeAll(() => {
    execFileSync("npx", ["vite", "build"], { cwd: rootDir, stdio: "pipe" });
  }, 60_000);

  test("build produces an installable web app manifest", () => {
    const manifestPath = resolve(distDir, "manifest.webmanifest");
    expect(existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    expect(manifest.name).toBe("InkNote AI");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test("build produces a registered service worker for offline app shell caching", () => {
    const files = readdirSync(distDir);
    const serviceWorker = files.find((file: string) => file === "sw.js");
    expect(serviceWorker).toBeDefined();

    const indexHtml = readFileSync(resolve(distDir, "index.html"), "utf-8");
    expect(indexHtml).toContain("manifest.webmanifest");
  });
});
