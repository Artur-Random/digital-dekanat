import "dotenv/config";

import { type Page, expect } from "@playwright/test";

import type { Screen, TestAccount } from "./screens";

const PASSWORD_ENV: Record<TestAccount, string> = {
  alina: "DEMO_PASSWORD_ALINA",
  denis: "DEMO_PASSWORD_DENIS",
  mfc: "DEMO_PASSWORD_MFC",
  dekanat: "DEMO_PASSWORD_DEKANAT",
};

export function passwordFor(account: TestAccount): string {
  const value = process.env[PASSWORD_ENV[account]];
  if (!value) throw new Error(`Не задан ${PASSWORD_ENV[account]} в .env`);
  return value;
}

/** Заполнить и отправить форму входа на уже открытой странице /login. */
export async function submitLogin(page: Page, login: string, password: string): Promise<void> {
  await page.getByLabel("Логин").fill(login);
  await page.getByLabel("Пароль").fill(password);
  // Ждём ответ Server Action, иначе следующая попытка уйдёт раньше ответа на предыдущую.
  await Promise.all([
    page.waitForResponse(
      (r) => r.request().method() === "POST" && new URL(r.url()).pathname === "/login",
    ),
    page.getByRole("button", { name: "Войти" }).click(),
  ]);
}

/** Вход под тестовым аккаунтом через форму, как это делает человек. */
export async function loginAs(page: Page, account: TestAccount): Promise<void> {
  await page.goto("/login");
  await submitLogin(page, account, passwordFor(account));
  await expect(page).not.toHaveURL(/\/login/);
}

/** Готовит страницу к открытию экрана: входит под нужным аккаунтом, если экран не публичный. */
export async function prepareForScreen(page: Page, screen: Screen): Promise<void> {
  if (screen.role !== "anonymous" && screen.account) {
    await loginAs(page, screen.account);
  }
}
