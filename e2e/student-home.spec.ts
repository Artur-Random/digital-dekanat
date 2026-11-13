// Главная, расписание, уведомления и «Назад» (задание 4). Ожидания берутся из базы через
// helper, а не по дню недели: тесты проходят в любой день, включая выходные.
// Файл выполняется последовательно: тесты меняют прочитанность уведомлений Алины.
// Перед запуском нужен свежий сброс демо-данных (npm run demo:reset), как в CI.

import { type Page, expect, test } from "@playwright/test";

import { mondayOf, todayInMoscow } from "../src/lib/moscow-date";

import { loginAs } from "./auth";
import {
  applicationId,
  disconnect,
  notificationOf,
  retakeDiscipline,
  roomChange,
  unreadCount,
} from "./helpers/db";

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  await disconnect();
});

async function bellCount(page: Page): Promise<number> {
  return Number(await page.getByTestId("bell").getAttribute("data-unread"));
}

test("alina: «Сегодня» с «Изменено» и «было → стало», лента с пересдачей и справкой, счётчик", async ({
  page,
}) => {
  await loginAs(page, "alina");
  await page.goto("/");
  const today = page.getByTestId("today-block");
  await expect(today).toBeVisible();
  const change = await roomChange();
  const changed = today.locator(`#event-${change.eventId}`);
  await expect(changed.getByTestId("changed-badge")).toHaveText("Изменено");
  await expect(changed.getByTestId("diffs")).toContainText(
    `Аудитория: ${change.from} → ${change.to}`,
  );

  const feed = page.getByTestId("action-feed");
  await expect(feed).toContainText(`Пересдача по дисциплине «${await retakeDiscipline("alina")}»`);
  await expect(feed).toContainText("Справка готова, забрать в МФЦ");
  await expect(feed.getByRole("link", { name: "Норма N-14: открыть цитату" })).toBeVisible();

  const unread = await unreadCount("alina");
  expect(unread).toBeGreaterThan(0);
  await expect(page.getByTestId("bell")).toHaveAttribute(
    "aria-label",
    `Уведомления, непрочитанных: ${unread}`,
  );
  await expect(page.getByTestId("my-applications")).toBeVisible();
});

test("alina: переход по уведомлению об изменении ведёт к нужной паре и уменьшает счётчик", async ({
  page,
}) => {
  await loginAs(page, "alina");
  const notice = await notificationOf("alina", "Изменение в расписании");
  expect(notice.isRead).toBe(false);
  const anchor = notice.link?.split("#")[1];
  expect(anchor).toMatch(/^event-/);

  await page.goto("/notifications");
  const before = await bellCount(page);
  await page
    .locator('[data-testid="notification"][data-read="false"]')
    .filter({ hasText: notice.title })
    .first()
    .click();
  await expect(page).toHaveURL(new RegExp(`/schedule\\?week=\\d{4}-\\d{2}-\\d{2}#${anchor}$`));
  await expect(page.locator(`#${anchor}`)).toBeVisible();
  expect(await bellCount(page)).toBe(before - 1);
  expect(await unreadCount("alina")).toBe(before - 1);
});

test("alina: «Отметить все прочитанными» обнуляет счётчик", async ({ page }) => {
  await loginAs(page, "alina");
  await page.goto("/notifications");
  await page.getByRole("button", { name: "Отметить все прочитанными" }).click();
  await expect(page.getByTestId("bell")).toHaveAttribute("data-unread", "0");
  await expect(page.getByTestId("bell")).toHaveAttribute(
    "aria-label",
    "Уведомления, непрочитанных: 0",
  );
  expect(await unreadCount("alina")).toBe(0);
  await expect(page.getByRole("button", { name: "Отметить все прочитанными" })).toHaveCount(0);
});

test("denis: пары в пределах 6–8, нет пересдачи и окна стипендии", async ({ page }) => {
  await loginAs(page, "denis");
  await page.goto("/");
  const items = page.getByTestId("today-block").getByTestId("schedule-item");
  expect(await items.count()).toBeGreaterThan(0);
  for (const pair of await items.evaluateAll((els) =>
    els.map((e) => e.getAttribute("data-pair")),
  )) {
    expect(Number(pair)).toBeGreaterThanOrEqual(6);
    expect(Number(pair)).toBeLessThanOrEqual(8);
  }
  const main = page.locator("main");
  await expect(main).not.toContainText("Пересдача");
  await expect(main).not.toContainText("стипенди");
});

test("/schedule?week=мусор отдаёт 200 и текущую неделю", async ({ page }) => {
  await loginAs(page, "alina");
  const response = await page.goto("/schedule?week=мусор");
  expect(response?.status()).toBe(200);
  await expect(page.getByTestId("week-title")).toHaveAttribute(
    "data-week",
    mondayOf(todayInMoscow()),
  );
  await page.goto("/schedule?week=2020-01-06");
  await expect(page.getByTestId("week-empty")).toHaveText(
    "Расписание на эту неделю ещё не опубликовано",
  );
});

test("BackButton: прямой заход на /applications/<id> без истории, «Назад» ведёт на /applications", async ({
  page,
}) => {
  await loginAs(page, "alina");
  await page.goto(`/applications/${await applicationId("alina", "CERT_ENROLLMENT")}`);
  await page.getByTestId("back-button").click();
  await expect(page).toHaveURL(/\/applications$/);
});

test("BackButton: после перехода внутри сайта возвращает назад по истории", async ({ page }) => {
  await loginAs(page, "alina");
  await page.goto("/schedule");
  await page.getByTestId("bell").click();
  await expect(page).toHaveURL(/\/notifications$/);
  await page.getByTestId("back-button").click();
  await expect(page).toHaveURL(/\/schedule$/);
});

test("BackButton: после возврата к первому экрану ведёт в родителя, а не из сайта", async ({
  page,
}) => {
  await loginAs(page, "alina");
  await page.goto("/notifications");
  await page.getByRole("link", { name: "Расписание" }).click();
  await expect(page).toHaveURL(/\/schedule$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/notifications$/);
  await page.getByTestId("back-button").click();
  await expect(page).toHaveURL(/\/$/);
});

test("360 px: нет горизонтального скролла, последний элемент не перекрыт нижней навигацией", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loginAs(page, "alina");
  for (const path of ["/", "/schedule", "/schedule?view=week", "/notifications", "/why"]) {
    await page.goto(path);
    const result = await page.evaluate(async () => {
      window.scrollTo(0, document.documentElement.scrollHeight);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const main = document.querySelector("main");
      const last = main?.lastElementChild;
      const nav = document.querySelector('nav[aria-label="Разделы"]');
      const navTop =
        nav && getComputedStyle(nav).position === "fixed"
          ? nav.getBoundingClientRect().top
          : Number.POSITIVE_INFINITY;
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        lastBottom: last?.getBoundingClientRect().bottom ?? 0,
        navTop,
      };
    });
    expect(result.scrollWidth, path).toBeLessThanOrEqual(result.clientWidth);
    expect(result.lastBottom, path).toBeLessThanOrEqual(result.navTop);
  }
});
