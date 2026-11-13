// Доступ к «Учёбе» (CLAUDE.md, «Безопасность», п. 12; задание 5).

import { expect, test } from "@playwright/test";

import { loginAs } from "../auth";
import { currentAssessmentOf, debtOf, disconnect } from "../helpers/db";

test.afterAll(async () => {
  await disconnect();
});

test("alina не открывает оценку Дениса, denis не открывает задолженность Алины: 404 одинаково", async ({
  page,
}) => {
  const denisCredit = await currentAssessmentOf("denis", "CREDIT");
  const alinaDebt = await debtOf("alina");
  await loginAs(page, "alina");
  const foreign = await page.goto(`/study/${denisCredit.id}`);
  const foreignText = await page.getByRole("heading", { level: 1 }).innerText();
  const missing = await page.goto("/study/cmissing0000000000000000");
  const missingText = await page.getByRole("heading", { level: 1 }).innerText();
  expect(foreign?.status()).toBe(404);
  expect(missing?.status()).toBe(404);
  expect(foreignText).toBe(missingText);
  expect((await page.goto("/study/мусор"))?.status()).toBe(404);

  // Вошедшего пользователя /login уводит дальше: выходим, сбросив cookie.
  await page.context().clearCookies();
  await loginAs(page, "denis");
  expect((await page.goto(`/study/${alinaDebt.assessmentId}`))?.status()).toBe(404);
});

for (const staff of ["mfc", "dekanat"] as const) {
  test(`${staff} на /study и /study/<id>: 404`, async ({ page }) => {
    const alinaDebt = await debtOf("alina");
    await loginAs(page, staff);
    for (const path of ["/study", `/study/${alinaDebt.assessmentId}`, "/cant-attend"]) {
      expect((await page.goto(path))?.status(), path).toBe(404);
    }
  });
}

test("аноним с /study уходит на /login", async ({ page }) => {
  await page.goto("/study");
  expect(new URL(page.url()).pathname).toBe("/login");
});

test("?semester=мусор — 200 и семестр по умолчанию (последний с результатами)", async ({
  page,
}) => {
  await loginAs(page, "alina");
  const response = await page.goto("/study?semester=мусор");
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("navigation", { name: "Семестры" }).locator('[aria-current="page"]'),
  ).toHaveText("2 семестр");
  await page.goto("/study?semester=99");
  await expect(
    page.getByRole("navigation", { name: "Семестры" }).locator('[aria-current="page"]'),
  ).toHaveText("2 семестр");
});
