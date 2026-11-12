// Страницы с данными не кешируются: после выхода «Назад» не показывает данные.
// Next.js сам отдаёт для динамических страниц и RSC-запросов
// «private, no-cache, no-store, max-age=0, must-revalidate» — тест закрепляет это поведение.

import { type Page, expect, test } from "@playwright/test";

import { loginAs } from "../auth";

function expectNoStore(value: string | undefined, what: string): void {
  expect(value ?? "", what).toContain("no-store");
}

async function documentCacheControl(page: Page, path: string): Promise<string | undefined> {
  const res = await page.goto(path);
  expect(res?.status(), path).toBe(200);
  return res?.headers()["cache-control"];
}

test("страницы студента и RSC-запросы отдаются с no-store, статика с долгим кешем", async ({
  page,
}) => {
  const rsc: string[] = [];
  const staticCache: string[] = [];
  page.on("response", (r) => {
    const url = new URL(r.url());
    if (r.request().headers()["rsc"]) rsc.push(`${url.pathname} ${r.headers()["cache-control"]}`);
    if (url.pathname.startsWith("/_next/static/") && r.status() === 200) {
      staticCache.push(r.headers()["cache-control"] ?? "");
    }
  });

  await loginAs(page, "alina");
  for (const path of ["/", "/profile", "/applications"]) {
    expectNoStore(await documentCacheControl(page, path), path);
  }

  // Клиентская навигация идёт RSC-запросами.
  await page.getByRole("link", { name: "Профиль" }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await page.getByRole("link", { name: "Заявки" }).click();
  await expect(page).toHaveURL(/\/applications$/);
  await expect.poll(() => rsc.length).toBeGreaterThan(0);
  for (const entry of rsc) expect(entry, "RSC").toContain("no-store");

  expect(staticCache.length).toBeGreaterThan(0);
  for (const value of staticCache) expect(value).toContain("immutable");
});

test("страницы сотрудника отдаются с no-store", async ({ page }) => {
  await loginAs(page, "mfc");
  for (const path of ["/staff", "/staff/profile"]) {
    expectNoStore(await documentCacheControl(page, path), path);
  }
});

test("выход → «Назад» показывает вход, а не данные", async ({ page }) => {
  await loginAs(page, "alina");
  await page.goto("/profile");
  const name = await page.getByTestId("profile-name").innerText();
  expect(name.length).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Выйти" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goBack();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText(name)).toHaveCount(0);
});
