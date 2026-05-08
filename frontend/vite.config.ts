/// <reference types="vitest/config" />

import { defineConfig, type UserConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";
import type { InlineConfig } from "vitest/node";

const config = {
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    outDir: fileURLToPath(new URL("../internal/server/dist", import.meta.url)),
    emptyOutDir: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    exclude: ["e2e/**", "node_modules/**"],
  },
} satisfies UserConfig & { test: InlineConfig };

export default defineConfig(config);
