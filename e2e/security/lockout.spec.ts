// Блокировка входа (CLAUDE.md, «Безопасность», п. 7). Отдельный проект Playwright «lockout»
// запускается после всех остальных тестов: блокировка на время запирает denis, и параллельные
// тесты под denis падали бы при входе.

import { expect, test } from "@playwright/test";

import { passwordFor, submitLogin } from "../auth";
import { clearLoginAttempts, disconnect } from "../helpers/db";

const LOGIN_ERROR = "Неверный логин или пароль.";

test.afterAll(async () => {
  await clearLoginAttempts("denis");
  await disconnect();
});

test("после 5 неудачных попыток вход заблокирован даже с верным паролем", async ({ page }) => {
  await clearLoginAttempts("denis");
  await page.goto("/login");
  for (let i = 1; i <= 5; i++) {
    await submitLogin(page, "denis", `wrong-${i}`);
    await expect(page.getByTestId("login-error")).toContainText(LOGIN_ERROR);
  }
  // Шестая неудачная попытка заблокирована.
  await submitLogin(page, "denis", "wrong-6");
  await expect(page.getByTestId("login-error")).toContainText(/Попробуйте через \d+ минут/);

  // Верный пароль во время блокировки тоже не пускает.
  await submitLogin(page, "denis", passwordFor("denis"));
  await expect(page.getByTestId("login-error")).toContainText(/Попробуйте через \d+ минут/);
  await expect(page).toHaveURL(/\/login/);

  await clearLoginAttempts("denis");
});
