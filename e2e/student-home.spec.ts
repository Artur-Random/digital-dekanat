// Главная, расписание, уведомления и «Назад» (задание 4). Ожидания берутся из базы через
// helper, а не по дню недели: тесты проходят в любой день, включая выходные.
// Файл выполняется последовательно: тесты меняют прочитанность уведомлений Алины.
// Перед запуском нужен свежий сброс демо-данных (npm run demo:reset), как в CI.

import { type Page, expect, test } from "@playwright/test";

import { addDays, mondayOf, todayInMoscow } from "../src/lib/moscow-date";
import { academicYear } from "../src/server/rules/academic-year";

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
  await expect(feed.getByRole("link", { name: "426общ, п. 7.13: открыть цитату" })).toBeVisible();

  // Счётчик сверяется с базой. Без требования «больше нуля»: при повторе в CI тест может идти
  // после «Отметить все прочитанными», и тогда непрочитанных честно ноль.
  const unread = await unreadCount("alina");
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
  // Прошедшая неделя без пар: расписание было, пар нет (замечание Максима, #33).
  await page.goto("/schedule?week=2020-01-06");
  await expect(page.getByTestId("week-empty")).toHaveText("На эту неделю пар нет");
  // Будущая неделя без пар: расписание ещё не опубликовано.
  await page.goto("/schedule?week=2099-01-05");
  await expect(page.getByTestId("week-empty")).toHaveText(
    "Расписание на эту неделю ещё не опубликовано",
  );
});

test("BackButton: прямой заход на /applications/<id> без истории, «Назад» ведёт на /applications", async ({
  page,
}) => {
  await loginAs(page, "alina");
  await page.goto(`/applications/${await applicationId("alina", "CERT_ENROLLMENT")}`);
  await page.getByTestId("back-button").filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/applications$/);
});

test("BackButton: после перехода внутри сайта возвращает назад по истории", async ({ page }) => {
  await loginAs(page, "alina");
  await page.goto("/schedule");
  await page.getByTestId("bell").click();
  await expect(page).toHaveURL(/\/notifications$/);
  await page.getByTestId("back-button").filter({ visible: true }).click();
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
  // Next 16 держит прошлый экран в DOM скрытым: кнопок «Назад» может быть две, нажимаем видимую.
  await page.getByTestId("back-button").filter({ visible: true }).click();
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

test("расписание: «Завтра», выбор даты, пустые дни и неопубликованные недели (#43)", async ({
  page,
}) => {
  const today = todayInMoscow();
  const year = academicYear(today);
  await page.setViewportSize({ width: 360, height: 800 });
  await loginAs(page, "alina");
  await page.goto("/schedule");

  // На 360 px вкладки и кнопка даты в одну строку, без горизонтального скролла.
  const nav = page.getByRole("navigation", { name: "Вид расписания" });
  const tabs = nav.locator("a, [data-testid=pick-date]");
  await expect(tabs).toHaveCount(4);
  const tops = await tabs.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
  expect(new Set(tops).size).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await expect(page.getByLabel("Выбрать дату")).toBeVisible();

  await nav.getByRole("link", { name: "Завтра" }).click();
  await expect(page.getByTestId("day-view")).toHaveAttribute("data-date", addDays(today, 1));

  // С «Завтра» можно выбрать и сегодняшнюю дату (замечание Codex в PR #49).
  await expect(page.getByTestId("pick-date-input")).toHaveValue("");
  await page.getByTestId("pick-date-input").fill(today);
  await expect(page.getByTestId("day-view")).toHaveAttribute("data-date", today);
  // Выбор даты через календарь открывает этот день.
  const picked = addDays(today, 2);
  await page.getByTestId("pick-date-input").fill(picked);
  await expect(page).toHaveURL(new RegExp(`/schedule\\?day=${picked}$`));
  await expect(page.getByTestId("day-view")).toHaveAttribute("data-date", picked);
  await expect(page.getByTestId("pick-date-input")).toHaveAttribute("min", year.start);
  await expect(page.getByTestId("pick-date-input")).toHaveAttribute("max", year.end);

  // Прошедший день без пар (неделя начала учебного года в сиде пустая) — «В этот день пар нет».
  await page.goto(`/schedule?day=${year.start}`);
  await expect(page.getByTestId("day-empty")).toContainText("В этот день пар нет");
  // Будущая неделя без расписания — прежний текст.
  const lateSummer = addDays(year.end, -7);
  await page.goto(`/schedule?day=${lateSummer}`);
  await expect(page.getByTestId("day-empty")).toContainText(
    "Расписание на эту неделю ещё не опубликовано",
  );
  // Дата вне учебного года — обычный вид «Сегодня».
  await page.goto("/schedule?day=2020-01-06");
  await expect(page.getByTestId("day-view")).toHaveCount(0);
});

test("ссылка «Почему так» в шапке у студента и сотрудника", async ({ page }) => {
  await loginAs(page, "alina");
  await page.goto("/");
  await page.getByTestId("why-link").click();
  await expect(page).toHaveURL(/\/why$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Почему так");
  await page.context().clearCookies();
  await loginAs(page, "mfc");
  await page.goto("/staff");
  await expect(page.getByTestId("why-link")).toHaveAttribute("href", "/why");
});

test("потеря сети при отправке формы: понятное сообщение у формы, данные не теряются", async ({
  page,
  context,
}) => {
  await loginAs(page, "alina");
  await page.goto("/applications/new/CERT_GRADES", { waitUntil: "networkidle" });
  await page.getByLabel("Куда нужна справка").fill("По месту требования");
  await context.setOffline(true);
  await page.getByRole("button", { name: "Заказать справку" }).click();
  await expect(page.getByTestId("form-message")).toContainText("Нет соединения с интернетом");
  await expect(page.getByLabel("Куда нужна справка")).toHaveValue("По месту требования");
  await context.setOffline(false);
});

test("тема: «Как в системе» по умолчанию, выбор в профиле сохраняется в cookie и сразу в HTML", async ({
  page,
  context,
}) => {
  await loginAs(page, "alina");
  await page.goto("/profile");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "system");
  await expect(page.getByRole("radio", { name: "Как в системе" })).toBeChecked();
  await page.getByRole("radio", { name: "Тёмная" }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  // После перезагрузки сервер сразу отдаёт тёмную тему: без мелькания белого.
  const response = await page.request.get("/");
  expect(await response.text()).toContain('data-theme="dark"');
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(20, 33, 61)");
  // Логотип для тёмного фона.
  await expect(page.locator("header img.logo-for-dark")).toBeVisible();
  await expect(page.locator("header img.logo-for-light")).toBeHidden();
  await page.getByRole("radio", { name: "Светлая" }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await context.clearCookies();
});

test("профиль: «Сменить пароль» неактивна с объяснением", async ({ page }) => {
  await loginAs(page, "alina");
  await page.goto("/profile");
  const button = page.getByRole("button", { name: "Сменить пароль" });
  await expect(button).toBeDisabled();
  await expect(page.getByText("В демоверсии пароли общие, смена отключена")).toBeVisible();
});
