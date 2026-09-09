import { defineConfig } from "vite";

// Proxies /api/* to the local Gemini interpretation server (see server/index.mjs)
// so the browser only ever talks same-origin; the Gemini API key stays server-side.
export default defineConfig({
  server: {
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});
