import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const isNetlifyBuild = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } })
  .process?.env?.NETLIFY === "true";

export default defineConfig(({ command }) => ({
  base: command === "build" && !isNetlifyBuild ? "/kids-sudoku-adventure/" : "/",
  plugins: [react()]
}));
