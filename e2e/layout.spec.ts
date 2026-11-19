// Раскладка (дизайн-проход 19.11): без горизонтальной прокрутки на 360, 768, 1024, 1440, 1920 px;
// на телефоне нижняя панель вкладок, с 768 px — колонка навигации слева.

import { expect, test } from "@playwright/test";

import { prepareForScreen } from "./auth";
import { SCREENS, resolvePath } from "./screens";

const WIDTHS = [360, 768, 1024, 1440, 1920] as const;
const MAIN = new Set([
  "login",
  "home",
  "schedule-today",
  "study",
  "application-extension",
  "cant-attend",
  "staff-queue",
  "staff-application",
  "why",
]);

for (const screen of SCREENS.filter((s) => MAIN.has(s.slug))) {
  test(`без горизонтальной прокрутки: ${screen.code} ${screen.slug}`, async ({ page }) => {
    await prepareForScreen(page, screen);
    const path = await resolvePath(screen);
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path, { waitUntil: "networkidle" });
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth, `${width}px`).toBeLessThanOrEqual(clientWidth);
    }
  });
}

test("навигация студента: внизу на телефоне, слева с 768 px", async ({ page }) => {
  const home = SCREENS.find((s) => s.slug === "home");
  if (!home) throw new Error("нет экрана home");
  await prepareForScreen(page, home);
  for (const [width, position] of [
    [360, "fixed"],
    [1440, "sticky"],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Разделы" })).toHaveCSS("position", position);
  }
});
