import { defineConfig, devices } from "@playwright/test";

import { BASE_URL } from "./e2e/base-url";

// Если BASE_URL не задан, Playwright сам поднимает dev-сервер на localhost:3000
// (или использует уже запущенный).
const startLocalServer = !process.env.BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    locale: "ru-RU",
    timezoneId: "Europe/Moscow",
    trace: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: startLocalServer
    ? {
        command: "npm run dev",
        url: `${BASE_URL}/login`,
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
});
