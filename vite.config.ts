import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/bristol-llm-housing-map/",
  plugins: [react()],
});
