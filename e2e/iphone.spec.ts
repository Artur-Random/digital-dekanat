// Правки после проверки Максима на iPhone (20.11). WebKit в среде не установлен, поэтому
// эмуляция iPhone 13 в Chromium: размер, плотность, сенсорный ввод, user agent iOS.

import { devices, expect, test } from "@playwright/test";

import { loginAs } from "./auth";

test.use({ ...devices["iPhone 13"], defaultBrowserType: "chromium" });

test("«Выбрать дату»: нажатие приходится прямо на нативное поле даты", async ({ page }) => {
  await loginAs(page, "alina");
  await page.goto("/schedule");
  await expect(page.getByTestId("pick-date").filter({ visible: true })).toBeVisible();
  const button = page.getByTestId("pick-date").filter({ visible: true });
  const box = await button.boundingBox();
  if (!box) throw new Error("нет кнопки");
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  // В центре и по углам иконки верхний элемент — само поле <input type="date">.
  for (const [dx, dy] of [
    [0.5, 0.5],
    [0.1, 0.1],
    [0.9, 0.9],
  ] as const) {
    const hit = await page.evaluate(
      ([x, y]) => {
        const el = document.elementFromPoint(x ?? 0, y ?? 0);
        return el instanceof HTMLInputElement ? el.type : el?.tagName;
      },
      [box.x + box.width * dx, box.y + box.height * dy],
    );
    expect(hit).toBe("date");
  }
  await button.locator("input").tap();
  await expect(page.getByTestId("pick-date-input")).toBeFocused();
  await expect(page.getByLabel("Выбрать дату")).toHaveAttribute("type", "date");
});

test("«Неделя»: кнопки в одну строку, стрелки с aria-label", async ({ page }) => {
  await loginAs(page, "alina");
  await page.goto("/schedule?view=week");
  await page.getByRole("link", { name: "Следующая неделя" }).click();
  await expect(page.getByRole("link", { name: "Текущая неделя" })).toBeVisible();
  const tops = await page
    .getByRole("link", { name: /Предыдущая неделя|Текущая неделя|Следующая неделя/ })
    .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
  expect(tops).toHaveLength(3);
  expect(new Set(tops).size).toBe(1);
});

test("тёмная тема: невыбранные радиокнопки прозрачные с рамкой, выбранная — с точкой", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([
    { name: "theme", value: "dark", url: baseURL ?? "http://localhost:3000" },
  ]);
  await loginAs(page, "alina");
  await page.goto("/profile");
  const radios = page.getByTestId("theme-switcher").locator('input[type="radio"]');
  await expect(radios).toHaveCount(3);
  for (const radio of await radios.all()) {
    await expect(radio).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    const checked = await radio.isChecked();
    const dot = await radio.evaluate((el) => getComputedStyle(el, "::before").transform);
    expect(dot === "none" || dot === "matrix(1, 0, 0, 1, 0, 0)", `точка: ${dot}`).toBe(checked);
  }
});

test("плашка концепта целиком ниже статус-бара (safe-area + запас iOS)", async ({ page }) => {
  const SAFE_TOP = 47;
  await page.goto("/login");
  // В эмуляции env(safe-area-inset-top) = 0, а запас включается только в iOS Safari:
  // задаём оба значения явно, как на iPhone.
  await page.evaluate((px) => {
    document.documentElement.style.setProperty("--safe-top", `${px}px`);
    document.documentElement.style.setProperty("--banner-gap", "12px");
  }, SAFE_TOP);
  const text = page.getByTestId("concept-banner").locator("p");
  const textBox = await text.boundingBox();
  expect(textBox?.y ?? 0).toBeGreaterThanOrEqual(SAFE_TOP + 12);
  const shield = await page.getByTestId("status-bar-shield").boundingBox();
  expect(shield?.height).toBe(SAFE_TOP + 12);
});

test("высокая контрастность: радиокнопки в системном виде", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/login");
  const appearance = await page.evaluate(() => {
    const r = document.createElement("input");
    r.type = "radio";
    document.body.append(r);
    return getComputedStyle(r).appearance;
  });
  expect(appearance).toBe("auto");
});
