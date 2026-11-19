// PWA (docs/pwa-requirements.md, «Проверки»). Service worker регистрируется только в production,
// поэтому проверки с ним идут на production-сборке (CI: E2E_PRODUCTION=1).

import { expect, test } from "@playwright/test";

import { loginAs } from "./auth";

const isProduction = process.env.E2E_PRODUCTION === "1";

test("manifest корректен, иконки и apple-touch-icon грузятся", async ({ page, request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.status()).toBe(200);
  const manifest = (await res.json()) as {
    name: string;
    short_name: string;
    display: string;
    start_url: string;
    icons: { src: string; sizes: string; purpose?: string }[];
  };
  expect(manifest.short_name).toBe("Студкаб");
  expect(manifest.name).not.toContain("МГПУ");
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/");
  expect(manifest.icons.map((i) => `${i.sizes} ${i.purpose ?? "any"}`).sort()).toEqual([
    "192x192 any",
    "512x512 any",
    "512x512 maskable",
  ]);
  for (const icon of manifest.icons) {
    const r = await request.get(icon.src);
    expect(r.status(), icon.src).toBe(200);
    expect(r.headers()["content-type"]).toContain("image/png");
  }
  await page.goto("/login");
  const apple = page.locator('link[rel="apple-touch-icon"]');
  await expect(apple).toHaveAttribute("href", "/icons/apple-touch-icon.png");
  expect((await request.get("/icons/apple-touch-icon.png")).status()).toBe(200);
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
});

test("service worker: офлайн-страница без сети, после выхода в кешах нет HTML, RSC и /api", async ({
  page,
  context,
}) => {
  test.skip(!isProduction, "service worker регистрируется только в production-сборке");
  await loginAs(page, "alina");
  await page.goto("/profile");
  await page.evaluate(() => navigator.serviceWorker.ready);
  // Страница под контролем service worker после перезагрузки.
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);

  await context.setOffline(true);
  await page.goto("/schedule").catch(() => undefined);
  await expect(page.getByRole("heading", { name: "Нет соединения" })).toBeVisible();
  await expect(page.locator(".banner")).toContainText("Концепт для конкурса");
  await context.setOffline(false);

  await page.goto("/profile");
  await page.getByRole("button", { name: "Выйти" }).click();
  await expect(page).toHaveURL(/\/login/);
  const cached = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const key of await caches.keys()) {
      const cache = await caches.open(key);
      for (const req of await cache.keys()) urls.push(new URL(req.url).pathname);
    }
    return urls;
  });
  const allowed = /^\/(_next\/static\/|brand\/|icons\/|offline\.html$)/;
  expect(cached.filter((u) => !allowed.test(u))).toEqual([]);

  // «Назад» после выхода не показывает данные.
  await page.goBack();
  await expect(page).toHaveURL(/\/login/);
});
