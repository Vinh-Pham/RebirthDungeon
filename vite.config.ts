import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          includeDependenciesRecursively: false,
          groups: [
            { name: "storage", test: /node_modules\/dexie\// },
            { name: "catalogs", test: /\/game\/content\/data\/[^/]+\.json$/ },
            {
              name: "viewport-motion",
              test: /node_modules\/(?:pixi-viewport|gsap)\//,
            },
          ],
        },
      },
    },
  },
});
