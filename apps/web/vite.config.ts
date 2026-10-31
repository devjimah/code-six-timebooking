import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    // The browser talks to the API on the same origin, so the httpOnly session cookie just works (ADR 0002).
    proxy: {
      "/api": process.env.API_URL ?? "http://localhost:3001",
    },
  },
})
