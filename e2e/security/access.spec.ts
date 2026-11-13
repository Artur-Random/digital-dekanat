// Тесты подмены адреса и входа (CLAUDE.md, «Безопасность», п. 12; задание 2, раздел 8).
// Файл выполняется последовательно: тест блокировки временно запирает аккаунт denis.

import { type Page, expect, test } from "@playwright/test";

import { loginAs, passwordFor, submitLogin } from "../auth";
import { BASE_URL } from "../base-url";
import { applicationId, clearLoginAttempts, disconnect } from "../helpers/db";

test.describe.configure({ mode: "serial" });

const LOGIN_ERROR = "Неверный логин или пароль.";
const isProductionRun = process.env.E2E_PRODUCTION === "1";

let ids: {
  alinaCert: string;
  alinaExtension: string;
  denisSummons: string;
  denisLeave: string;
};

test.beforeAll(async () => {
  ids = {
    alinaCert: await applicationId("alina", "CERT_ENROLLMENT"),
    alinaExtension: await applicationId("alina", "PA_EXTENSION"),
    denisSummons: await applicationId("denis", "CERT_SUMMONS"),
    denisLeave: await applicationId("denis", "ACADEMIC_LEAVE"),
  };
});

test.afterAll(async () => {
  for (const login of ["alina", "denis", "no-such-user"]) await clearLoginAttempts(login);
  await disconnect();
});

async function expectStatus(page: Page, path: string, status: number): Promise<void> {
  const response = await page.goto(path);
  expect(response?.status(), path).toBe(status);
}

test("1. аноним уходит на /login с next", async ({ page }) => {
  const paths = ["/", "/profile", `/applications/${ids.alinaCert}`, "/staff"];
  for (const path of paths) {
    await page.goto(path);
    const url = new URL(page.url());
    expect(url.pathname, path).toBe("/login");
    expect(url.searchParams.get("next"), path).toBe(path);
  }
});

test("2. alina открывает свою заявку, но не заявку Дениса", async ({ page }) => {
  await loginAs(page, "alina");
  await expectStatus(page, `/applications/${ids.alinaCert}`, 200);
  await expect(page.getByTestId("application-status")).toHaveText("Готова к выдаче в МФЦ");
  await expectStatus(page, `/applications/${ids.denisSummons}`, 404);
});

test("3. denis не открывает заявку Алины", async ({ page }) => {
  await loginAs(page, "denis");
  await expectStatus(page, `/applications/${ids.alinaCert}`, 404);
  await expectStatus(page, `/applications/${ids.alinaExtension}`, 404);
});

test("4. студент не открывает страницы сотрудника", async ({ page }) => {
  await loginAs(page, "alina");
  await expectStatus(page, "/staff", 404);
  await expectStatus(page, `/staff/applications/${ids.alinaCert}`, 404);
  await expectStatus(page, "/staff/profile", 404);
});

test("5. mfc видит справку Алины, но не заявление в деканат", async ({ page }) => {
  await loginAs(page, "mfc");
  await expectStatus(page, `/staff/applications/${ids.alinaExtension}`, 404);
  await expectStatus(page, `/staff/applications/${ids.alinaCert}`, 200);
  await expect(page.getByTestId("application-student")).toContainText("Морозова Алина");
});

test("6. dekanat не открывает справку Дениса из МФЦ", async ({ page }) => {
  await loginAs(page, "dekanat");
  await expectStatus(page, `/staff/applications/${ids.denisSummons}`, 404);
  // Сотрудник тоже не открывает страницы студента.
  await expectStatus(page, `/applications/${ids.alinaExtension}`, 404);
});

/** ID заявок, на которые есть ссылки в очереди E1. */
async function queueIds(page: Page): Promise<string[]> {
  await page.goto("/staff");
  const hrefs = await page
    .locator('a[href^="/staff/applications/"]')
    .evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? ""));
  return hrefs.map((h) => h.split("/").pop() ?? "");
}

/** ID заявок в списке S4 студента. */
async function studentListIds(page: Page): Promise<string[]> {
  await page.goto("/applications");
  const hrefs = await page
    .locator('a[href^="/applications/"]')
    .evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? ""));
  return hrefs.map((h) => h.split("/").pop() ?? "");
}

test("6а. очереди подразделений: академический отпуск у МФЦ (N-45), продление у деканата", async ({
  page,
}) => {
  await loginAs(page, "mfc");
  const mfcQueue = await queueIds(page);
  expect(mfcQueue).toEqual(
    expect.arrayContaining([ids.alinaCert, ids.denisSummons, ids.denisLeave]),
  );
  expect(mfcQueue).not.toContain(ids.alinaExtension);
  await expectStatus(page, `/staff/applications/${ids.denisLeave}`, 200);

  await page.context().clearCookies();
  await loginAs(page, "dekanat");
  const dekanatQueue = await queueIds(page);
  expect(dekanatQueue).toEqual([ids.alinaExtension]);
  await expectStatus(page, `/staff/applications/${ids.denisLeave}`, 404);
  await expectStatus(page, `/staff/applications/${ids.alinaCert}`, 404);
});

test("6б. заявление на академический отпуск видит только его автор", async ({ page }) => {
  await loginAs(page, "alina");
  await expectStatus(page, `/applications/${ids.denisLeave}`, 404);
  expect(await studentListIds(page)).not.toContain(ids.denisLeave);

  await page.context().clearCookies();
  await loginAs(page, "denis");
  expect(await studentListIds(page)).toEqual(
    expect.arrayContaining([ids.denisLeave, ids.denisSummons]),
  );
  await expectStatus(page, `/applications/${ids.denisLeave}`, 200);
});

test("7. одинаковая ошибка при неверном пароле и несуществующем логине", async ({ page }) => {
  await page.goto("/login");
  await submitLogin(page, "alina", "wrong-password");
  await expect(page.getByTestId("login-error")).not.toBeEmpty();
  const wrongPassword = await page.getByTestId("login-error").innerText();

  await page.goto("/login");
  await submitLogin(page, "no-such-user", "wrong-password");
  await expect(page.getByTestId("login-error")).not.toBeEmpty();
  const noUser = await page.getByTestId("login-error").innerText();

  expect(wrongPassword).toBe(LOGIN_ERROR);
  expect(noUser).toBe(wrongPassword);
});

test("9. после выхода старая cookie не даёт доступа", async ({ page, browser }) => {
  await loginAs(page, "alina");
  const saved = await page.context().cookies();
  await page.goto("/profile");
  await page.getByRole("button", { name: "Выйти" }).click();
  await expect(page).toHaveURL(/\/login/);

  const replay = await browser.newContext();
  await replay.addCookies(saved);
  const replayPage = await replay.newPage();
  await replayPage.goto("/profile");
  expect(new URL(replayPage.url()).pathname).toBe("/login");
  await replay.close();
});

test("10. ?next= с внешним адресом оставляет на сайте", async ({ page }) => {
  const attacks = [
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    // Нормализация «.» и «..» даёт «//evil.example» (находка security-reviewer).
    "/.//evil.example",
    "/x/..//evil.example",
  ];
  const origin = new URL(BASE_URL).origin;
  for (const next of attacks) {
    await page.context().clearCookies();
    await page.goto(`/login?next=${encodeURIComponent(next)}`);
    await submitLogin(page, "alina", passwordFor("alina"));
    await expect(page).not.toHaveURL(/\/login/);
    expect(new URL(page.url()).origin, next).toBe(origin);
    expect(new URL(page.url()).pathname, next).toBe("/");

    // Уже вошедший пользователь открывает ту же ссылку: тоже остаётся на сайте.
    await page.goto(`/login?next=${encodeURIComponent(next)}`);
    expect(new URL(page.url()).origin, `вошедший: ${next}`).toBe(origin);
    expect(new URL(page.url()).pathname, `вошедший: ${next}`).toBe("/");
  }
});

test("11. cookie сессии: httpOnly, SameSite=Lax, Secure на production", async ({ page }) => {
  await loginAs(page, "alina");
  const cookies = await page.context().cookies();
  const session = cookies.find((c) => c.name.endsWith("dd_session"));
  expect(session, "cookie сессии").toBeDefined();
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Lax");
  expect(session?.path).toBe("/");
  // Токен в cookie: 32 байта в base64url.
  expect(session?.value).toMatch(/^[A-Za-z0-9_-]{43}$/);
  if (isProductionRun) {
    expect(session?.secure).toBe(true);
    expect(session?.name).toBe("__Host-dd_session");
  }
});
