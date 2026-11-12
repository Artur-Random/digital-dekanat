import "dotenv/config";

import { defineConfig, devices } from "@playwright/test";

import { BASE_URL } from "./e2e/base-url";

// Если BASE_URL не задан, Playwright сам поднимает dev-сервер на localhost:3000
// (или использует уже запущенный).
const startLocalServer = !process.env.BASE_URL;

// Локальный production-стек за Caddy с SITE_DOMAIN=localhost использует внутренний
// сертификат Caddy. На развёрнутом сайте сертификат настоящий, проверка не отключается.
const ignoreHTTPSErrors = process.env.E2E_IGNORE_HTTPS_ERRORS === "1";

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
    ignoreHTTPSErrors,
  },
  projects: [
    // Основной набор: локальный dev или production-сборка с тестовой базой.
    {
      name: "chromium",
      testIgnore: ["prod-smoke/**"],
      use: { ...devices["Desktop Chrome"] },
    },
    // Только неизменяющие проверки без входа против развёрнутого сайта (deploy.yml).
    // Тесты с входом и блокировкой на развёрнутом сайте запрещены: они ломают демо экспертам.
    {
      name: "prod-smoke",
      testDir: "./e2e/prod-smoke",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: startLocalServer
    ? {
        command: "npm run dev",
        url: `${BASE_URL}/login`,
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
});
