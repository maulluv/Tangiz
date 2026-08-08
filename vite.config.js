import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    // У режимі розробки всі запити на /api проксіюються до бекенду (порт 4000),
    // тож фронт звертається до того самого origin — без CORS і без хардкоду порту.
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
});
