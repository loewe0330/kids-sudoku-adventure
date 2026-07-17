import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { omitOriginalChapterImages } from "./scripts/omit-original-chapter-images.mjs";

const runtimeEnv = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } })
  .process?.env;
const buildBasePath = runtimeEnv?.VITE_BASE_PATH || "/";

export default defineConfig({
  base: buildBasePath,
  plugins: [react(), omitOriginalChapterImages()]
});
