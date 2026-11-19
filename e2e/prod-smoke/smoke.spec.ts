// Smoke-проверки развёрнутого сайта (deploy.yml, после проверки /api/health).
// Только неизменяющие запросы без входа: ни входа под демо-аккаунтами, ни тестов блокировки.
//
// Переменные окружения:
//   BASE_URL        https://studcab.ru (обязательно)
//   SMOKE_WWW_URL   https://www.studcab.ru (если не задано, проверка www пропускается)
//   EXPECT_VERSION  короткий SHA, который должен отдавать /api/health (необязательно)

import { expect, request, test } from "@playwright/test";

import { CONCEPT_BANNER_TEXT } from "../../src/lib/concept";

const BASE = process.env.BASE_URL ?? "";
const WWW = process.env.SMOKE_WWW_URL ?? "";
const VERSION = process.env.EXPECT_VERSION ?? "";
const ignoreHTTPSErrors = process.env.E2E_IGNORE_HTTPS_ERRORS === "1";

test.skip(!BASE.startsWith("https://"), "BASE_URL с https:// не задан");

test("HTTP перенаправляется на HTTPS с сохранением пути", async () => {
  const http = BASE.replace(/^https:/, "http:");
  const ctx = await request.newContext({ ignoreHTTPSErrors });
  const res = await ctx.get(`${http}/login?from=smoke`, { maxRedirects: 0 });
  expect([301, 308]).toContain(res.status());
  expect(res.headers()["location"]).toBe(`${BASE}/login?from=smoke`);
  await ctx.dispose();
});

test("www перенаправляется на основной домен постоянным 308", async () => {
  test.skip(!WWW, "SMOKE_WWW_URL не задан");
  const ctx = await request.newContext({ ignoreHTTPSErrors });
  const res = await ctx.get(`${WWW}/login?from=smoke`, { maxRedirects: 0 });
  expect(res.status()).toBe(308);
  expect(res.headers()["location"]).toBe(`${BASE}/login?from=smoke`);
  await ctx.dispose();
});

test("/api/health: база доступна, версия совпадает", async () => {
  const ctx = await request.newContext({ ignoreHTTPSErrors });
  const res = await ctx.get(`${BASE}/api/health`);
  expect(res.status()).toBe(200);
  const body = (await res.json()) as Record<string, unknown>;
  expect(body.db).toBe("ok");
  expect(Object.keys(body).sort()).toEqual(["db", "demoResetAt", "status", "version"]);
  if (VERSION) expect(body.version).toBe(VERSION);
  await ctx.dispose();
});

test("/login: 200, плашка, заголовки, без внешних запросов и ошибок, 360 px", async ({ page }) => {
  const origin = new URL(BASE).origin;
  const foreign: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (r) => {
    const url = new URL(r.url());
    if (url.protocol === "data:" || url.protocol === "blob:") return;
    if (url.origin !== origin) foreign.push(r.url());
  });
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => consoleErrors.push(e.message));

  await page.setViewportSize({ width: 360, height: 800 });
  const res = await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  expect(res?.status()).toBe(200);

  const banner = page.getByTestId("concept-banner");
  await expect(banner).toBeVisible();
  expect((await banner.innerText()).trim()).toBe(CONCEPT_BANNER_TEXT);

  const headers = res?.headers() ?? {};
  expect(headers["strict-transport-security"]).toBe("max-age=31536000");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["content-security-policy"]).not.toContain("unsafe-eval");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-powered-by"]).toBeUndefined();

  const overflow = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.client);
  expect(foreign).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("PWA: manifest и service worker отвечают 200 с правильным типом", async () => {
  const ctx = await request.newContext({ ignoreHTTPSErrors });
  const manifest = await ctx.get(`${BASE}/manifest.webmanifest`);
  expect(manifest.status()).toBe(200);
  expect(manifest.headers()["content-type"]).toContain("application/manifest+json");
  const sw = await ctx.get(`${BASE}/sw.js`);
  expect(sw.status()).toBe(200);
  expect(sw.headers()["content-type"]).toContain("javascript");
  await ctx.dispose();
});
