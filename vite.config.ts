import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/bristol-llm-housing-map/",
  build: {
    chunkSizeWarningLimit: 900,
  },
  plugins: [react()],
});
