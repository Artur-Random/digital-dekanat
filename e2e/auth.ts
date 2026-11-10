import type { Page } from "@playwright/test";

import type { Screen, TestAccount } from "./screens";

/**
 * Вход под тестовым аккаунтом.
 * TODO(задание 2): авторизация появится в задании 2. Для заглушек вход не нужен,
 * поэтому сейчас функция ничего не делает.
 */
export async function loginAs(page: Page, account: TestAccount): Promise<void> {
  void page;
  void account;
}

/** Готовит страницу к открытию экрана: входит под нужным аккаунтом, если экран не публичный. */
export async function prepareForScreen(page: Page, screen: Screen): Promise<void> {
  if (screen.role !== "anonymous" && screen.account) {
    await loginAs(page, screen.account);
  }
}
