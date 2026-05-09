import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),  // Tailwind v4 — processes @import 'tailwindcss', @theme, @layer
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // ── base: "/" — must be "/" for Render static site deployment ──────────────
  // (was "/tracker/" which broke routing on the root domain)
  base: "/",

  build: {
    // Warn when a chunk exceeds 800 KB after minification
    chunkSizeWarningLimit: 800,

    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — tiny, cache-busted very rarely
          "vendor-react":    ["react", "react-dom", "react-router"],

          // Firebase — large SDK, almost never changes
          "vendor-firebase": [
            "firebase/app",
            "firebase/auth",
            "firebase/firestore",
          ],

          // Leaflet map — medium, infrequently updated
          "vendor-leaflet": ["leaflet", "react-leaflet"],

          // Charts
          "vendor-recharts": ["recharts"],
        },
      },
    },
  },

  // ── Dev server proxy — forwards /api/* to the FastAPI backend ────────────
  server: {
    port: 3000,
    proxy: {
      "/api":    { target: "http://localhost:8000", changeOrigin: true },
      "/ws":     { target: "ws://localhost:8000",  ws: true },
      "/health": { target: "http://localhost:8000", changeOrigin: true },
    },
  },

  // ── Optimize known large deps ─────────────────────────────────────────────
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "firebase/app",
      "firebase/auth",
      "firebase/firestore",
      "leaflet",
      "react-leaflet",
      "recharts",
    ],
  },
});
