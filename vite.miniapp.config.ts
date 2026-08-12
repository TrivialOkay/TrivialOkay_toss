import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import aitDevtools from "@apps-in-toss/devtools/unplugin";

export default defineConfig({
  root: "miniapp",
  publicDir: "../public",
  base: "./",
  plugins: [aitDevtools.vite(), react()],
  build: {
    outDir: "../miniapp-dist",
    emptyOutDir: true,
  },
});
