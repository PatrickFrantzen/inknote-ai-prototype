import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Proxies /api/* to the local Gemini interpretation server (see server/index.mjs)
// so the browser only ever talks same-origin; the Gemini API key stays server-side.
export default defineConfig({
  server: {
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifest: {
        name: "InkNote AI",
        short_name: "InkNote",
        description: "Capture handwritten job notes and turn them into structured, exportable documents.",
        start_url: "/",
        display: "standalone",
        background_color: "#f5f5f4",
        theme_color: "#1c1917",
        icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
      },
      workbox: {
        // Manual Send needs the network; capture, review, storage, and export must work offline,
        // so precache the app shell and let interpretation requests fail on their own.
        globPatterns: ["**/*.{js,css,html,svg}"],
        navigateFallback: "/index.html",
      },
    }),
  ],
});
