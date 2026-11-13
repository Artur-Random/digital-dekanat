// Доступ к расписанию и уведомлениям (CLAUDE.md, «Безопасность», п. 12; задание 4).
// Ожидания вычисляются из базы: тесты проходят в любой день недели.

import { type Page, expect, test } from "@playwright/test";

import { loginAs } from "../auth";
import { disciplinesOfGroup, disconnect, notificationOf, retakeDiscipline } from "../helpers/db";

test.afterAll(async () => {
  await disconnect();
});

const STUDENT_PAGES = ["/", "/schedule", "/schedule?view=week", "/notifications"];

async function pageText(page: Page, path: string): Promise<string> {
  const response = await page.goto(path);
  expect(response?.status(), path).toBe(200);
  return page.locator("main").innerText();
}

test("alina не видит дисциплин и уведомлений Дениса", async ({ page }) => {
  const denisDisciplines = await disciplinesOfGroup("МП-261");
  const denisOnly = await notificationOf("denis", "Консультации");
  await loginAs(page, "alina");
  for (const path of STUDENT_PAGES) {
    const text = await pageText(page, path);
    for (const name of denisDisciplines) expect(text, `${path}: ${name}`).not.toContain(name);
    expect(text, path).not.toContain(denisOnly.title);
  }
});

test("denis не видит пересдачу Алины и дисциплин её группы", async ({ page }) => {
  const retake = await retakeDiscipline("alina");
  const alinaDisciplines = await disciplinesOfGroup("ПС-251");
  await loginAs(page, "denis");
  for (const path of STUDENT_PAGES) {
    const text = await pageText(page, path);
    expect(text, path).not.toContain(retake);
    expect(text, path).not.toContain("Пересдача");
    for (const name of alinaDisciplines) expect(text, `${path}: ${name}`).not.toContain(name);
  }
});

/** Отправить форму открытия уведомления с подменённым id. Возвращает итоговый путь. */
async function openWithId(page: Page, id: string): Promise<string> {
  // Ждём гидратацию: иначе React при гидратации вернёт своё поле id.
  await page.goto("/notifications", { waitUntil: "networkidle" });
  const form = page
    .locator("form")
    .filter({ has: page.getByTestId("notification") })
    .first();
  // Подменяем поле целиком: React может вернуть значение своего поля при отправке.
  await form.evaluate((el, value) => {
    el.querySelector('input[name="id"]')?.remove();
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "id";
    input.value = value;
    el.append(input);
  }, id);
  await form.getByTestId("notification").click();
  await page.waitForLoadState("networkidle");
  const url = new URL(page.url());
  return `${url.pathname}${url.search}${url.hash}`;
}

test("alina отмечает прочитанным уведомление Дениса: в базе ничего, ответ как на несуществующий id", async ({
  page,
}) => {
  const denis = await notificationOf("denis", "Изменение в расписании");
  await loginAs(page, "alina");
  const foreign = await openWithId(page, denis.id);
  const missing = await openWithId(page, "cmissing0000000000000000");
  expect(foreign).toBe("/notifications");
  expect(missing).toBe(foreign);
  const after = await notificationOf("denis", "Изменение в расписании");
  expect(after.isRead).toBe(denis.isRead);
});

for (const staff of ["mfc", "dekanat"] as const) {
  test(`${staff} не открывает страницы студента: 404`, async ({ page }) => {
    await loginAs(page, staff);
    for (const path of [
      "/",
      "/schedule",
      "/schedule?view=week",
      "/notifications",
      "/applications/new",
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
    }
  });
}

test("аноним с /schedule и /notifications уходит на /login", async ({ page }) => {
  for (const path of ["/schedule", "/notifications", "/why"]) {
    await page.goto(path);
    expect(new URL(page.url()).pathname, path).toBe("/login");
  }
});
