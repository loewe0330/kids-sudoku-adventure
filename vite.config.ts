import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { omitOriginalChapterImages } from "./scripts/omit-original-chapter-images.mjs";

const isNetlifyBuild = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } })
  .process?.env?.NETLIFY === "true";

export default defineConfig(({ command }) => ({
  base: command === "build" && !isNetlifyBuild ? "/kids-sudoku-adventure/" : "/",
  plugins: [react(), omitOriginalChapterImages()]
}));
