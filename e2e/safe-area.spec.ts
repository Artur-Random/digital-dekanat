// Режим «На экран Домой» на iPhone: зона под статус-баром. В эмуляции env(safe-area-inset-*)
// всегда 0, поэтому высоту задаём явно через переменную --safe-top (заглушка safe-area).

import { expect, test } from "@playwright/test";

import { loginAs } from "./auth";

const SAFE_TOP = 47;

test("при прокрутке контент не виден в зоне статус-бара, плашка сразу под полоской", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await loginAs(page, "alina");
  await page.goto("/schedule?view=week");
  // Страница стримится после loading.tsx: ждём содержимое, иначе прокручивать нечего.
  await expect(page.getByTestId("week-title")).toBeVisible();
  await page.evaluate((px) => {
    document.documentElement.style.setProperty("--safe-top", `${px}px`);
  }, SAFE_TOP);

  // Не прокручено: полоска и плашка одним блоком, без пустой полосы между ними.
  const shield = page.getByTestId("status-bar-shield");
  const banner = page.getByTestId("concept-banner");
  const shieldBox = await shield.boundingBox();
  expect(shieldBox?.height).toBe(SAFE_TOP);
  const colors = await page.evaluate(() => {
    const s = document.querySelector('[data-testid="status-bar-shield"]');
    const b = document.querySelector('[data-testid="concept-banner"]');
    return {
      shield: s ? getComputedStyle(s).backgroundColor : "",
      banner: b ? getComputedStyle(b).backgroundColor : "",
      backdrop: s ? getComputedStyle(s).backdropFilter : "",
      opacity: s ? getComputedStyle(s).opacity : "",
    };
  });
  expect(colors.shield).toBe(colors.banner);
  expect(colors.backdrop === "none" || colors.backdrop === "").toBe(true);
  expect(colors.opacity).toBe("1");
  // Текст плашки начинается ниже полоски.
  const text = banner.locator("p");
  expect((await text.boundingBox())?.y ?? 0).toBeGreaterThanOrEqual(SAFE_TOP);

  // Прокручено: в каждой точке зоны статус-бара сверху лежит полоска, а не контент.
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForFunction(() => window.scrollY > 300);
  const topElements = await page.evaluate((h) => {
    // elementsFromPoint пропускает элементы с pointer-events: none; для проверки включаем.
    const shieldEl = document.querySelector<HTMLElement>('[data-testid="status-bar-shield"]');
    if (shieldEl) shieldEl.style.pointerEvents = "auto";
    const ids: string[] = [];
    for (const x of [10, 100, 200, 380]) {
      for (const y of [1, Math.floor(h / 2), h - 1]) {
        const el = document.elementsFromPoint(x, y)[0];
        ids.push(el?.getAttribute("data-testid") ?? el?.tagName ?? "none");
      }
    }
    return ids;
  }, SAFE_TOP);
  expect(new Set(topElements)).toEqual(new Set(["status-bar-shield"]));
});

test("без safe-area полоска нулевой высоты: в браузере вид не меняется", async ({ page }) => {
  await page.goto("/login");
  const box = await page.getByTestId("status-bar-shield").boundingBox();
  expect(box === null || box.height === 0).toBe(true);
  expect((await page.getByTestId("concept-banner").boundingBox())?.y).toBe(0);
});
