import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { appPort } from "./scripts/app-config.mjs";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: appPort, strictPort: true, hmr: process.env.DISABLE_HMR !== "true" },
});
