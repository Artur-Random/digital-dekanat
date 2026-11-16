// Подмена id в формах действий с заявками (CLAUDE.md, «Безопасность», пп. 3, 4, 12).
// Без ошибок в коде тесты ничего не меняют в данных: чужая заявка остаётся как была.
// Статус проверяем через интерфейс владельца, а не через базу.

import { type Browser, type Page, expect, test } from "@playwright/test";

import type { TestAccount } from "../screens";
import { loginAs } from "../auth";
import { applicationId, disconnect } from "../helpers/db";

test.afterAll(async () => {
  await disconnect();
});

/** Подменить скрытое поле id в форме с кнопкой button и отправить её. */
async function submitWithId(page: Page, id: string, button: string) {
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: button }) });
  await form.evaluate((el, value) => {
    el.querySelector('input[name="id"]')?.remove();
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "id";
    input.value = value;
    el.append(input);
  }, id);
  await page.getByRole("button", { name: button }).click();
}

/** Статус заявки глазами её владельца или сотрудника подразделения. */
async function statusAs(
  browser: Browser,
  account: TestAccount,
  path: string,
): Promise<string | null> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginAs(page, account);
  await page.goto(path);
  const status = await page.getByTestId("application-status").textContent();
  await context.close();
  return status;
}

test("студент не отменит чужую заявку, подменив id", async ({ page, browser }) => {
  const own = await applicationId("alina", "PA_EXTENSION");
  const foreign = await applicationId("denis", "ACADEMIC_LEAVE");
  await loginAs(page, "alina");
  await page.goto(`/applications/${own}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Отменить заявку" }).click();
  const dialog = page.getByTestId("cancel-dialog");
  await dialog.locator("form").evaluate((el, value) => {
    el.querySelector('input[name="id"]')?.remove();
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "id";
    input.value = value;
    el.append(input);
  }, foreign);
  await dialog.getByRole("button", { name: "Отменить заявку" }).click();
  // Ответ тот же, что для несуществующей заявки: 404 на её адресе.
  await expect(page.getByRole("heading", { level: 1 })).toContainText("не найдена");
  expect(await statusAs(browser, "denis", `/applications/${foreign}`)).toBe("Подано");
  expect(await statusAs(browser, "alina", `/applications/${own}`)).toBe("Подано");
});

test("МФЦ не сменит статус заявления деканата, подменив id", async ({ page, browser }) => {
  const own = await applicationId("denis", "CERT_SUMMONS");
  const foreign = await applicationId("alina", "PA_EXTENSION");
  await loginAs(page, "mfc");
  await page.goto(`/staff/applications/${own}`, { waitUntil: "networkidle" });
  await submitWithId(page, foreign, "Справка готова к выдаче");
  await expect(page.getByTestId("form-message")).toHaveText("Заявка не найдена.");
  await page.reload();
  await expect(page.getByTestId("application-status")).toHaveText("Оформляется");
  expect(await statusAs(browser, "dekanat", `/staff/applications/${foreign}`)).toBe("Подано");
});

test("деканат не сменит статус справки МФЦ, подменив id", async ({ page, browser }) => {
  const own = await applicationId("alina", "PA_EXTENSION");
  const foreign = await applicationId("denis", "CERT_SUMMONS");
  await loginAs(page, "dekanat");
  await page.goto(`/staff/applications/${own}`, { waitUntil: "networkidle" });
  await submitWithId(page, foreign, "Взять на рассмотрение");
  await expect(page.getByTestId("form-message")).toHaveText("Заявка не найдена.");
  await page.reload();
  await expect(page.getByTestId("application-status")).toHaveText("Подано");
  expect(await statusAs(browser, "mfc", `/staff/applications/${foreign}`)).toBe("Оформляется");
});

test("студент не открывает формы недоступных типов", async ({ page }) => {
  await loginAs(page, "alina");
  for (const path of ["/applications/new/CERT_MILITARY", "/applications/new/UNKNOWN"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
  }
});
