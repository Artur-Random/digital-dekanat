import { expect, test } from "@playwright/test";

import { CONCEPT_BANNER_TEXT } from "../src/lib/concept";

import { prepareForScreen } from "./auth";
import { BASE_URL } from "./base-url";
import { SCREENS, resolvePath } from "./screens";

const appOrigin = new URL(BASE_URL).origin;

for (const screen of SCREENS) {
  test.describe(`${screen.code} ${screen.slug}`, () => {
    test("отвечает 200, плашка на месте, нет скролла на 360 px и внешних запросов", async ({
      page,
    }) => {
      const foreignRequests: string[] = [];
      page.on("request", (request) => {
        const url = new URL(request.url());
        // data: и blob: не уходят в сеть.
        if (url.protocol === "data:" || url.protocol === "blob:") return;
        if (url.origin !== appOrigin) foreignRequests.push(request.url());
      });
      // Нарушения CSP и ошибки гидрации видны только в консоли.
      const consoleErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => consoleErrors.push(error.message));

      await page.setViewportSize({ width: 360, height: 800 });
      await prepareForScreen(page, screen);

      const response = await page.goto(await resolvePath(screen), { waitUntil: "networkidle" });

      // а) страница отвечает 200
      expect(response?.status()).toBe(200);

      // б) плашка видна, текст дословный
      const banner = page.getByTestId("concept-banner");
      await expect(banner).toBeVisible();
      expect((await banner.innerText()).trim()).toBe(CONCEPT_BANNER_TEXT);

      // в) нет горизонтального скролла на 360 px
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

      // г) нет запросов на чужие домены
      expect(foreignRequests).toEqual([]);

      // Нет ошибок в консоли, в том числе нарушений CSP
      expect(consoleErrors).toEqual([]);

      // Заголовки безопасности (CLAUDE.md, «Безопасность», п. 11)
      const headers = response?.headers() ?? {};
      expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
      expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
      expect(headers["x-content-type-options"]).toBe("nosniff");
    });
  });
}

test("несуществующая страница: 404 на русском и плашка", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Страница не найдена");
  expect((await page.getByTestId("concept-banner").innerText()).trim()).toBe(CONCEPT_BANNER_TEXT);
});

test("/api/health отвечает db ok", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ok", db: "ok" });
});
