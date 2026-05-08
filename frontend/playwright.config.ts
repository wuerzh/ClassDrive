import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4175",
    headless: true,
    channel: "chrome",
  },
  webServer: {
    command: "node ./scripts/start-backend.mjs",
    url: "http://127.0.0.1:4175/login",
    timeout: 120_000,
    reuseExistingServer: false,
  },
});
