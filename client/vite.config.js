import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: "stats.json",
      template: "raw-data"
    })
  ],
  resolve: {
    alias: {
      // eslint-disable-next-line no-undef
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173, // Force Vite to always use port 5173
    strictPort: true, // Prevent switching to another port if 5173 is in use
  },
});
