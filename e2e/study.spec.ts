// «Учёба» (S3), «Что будет, если…» (S3a) и поиск в «Почему так» (S8), задание 5.
// Ожидаемые даты вычисляются из базы, а не захардкожены.

import { expect, test } from "@playwright/test";

import { formatDateKeySmart, formatDayTime } from "../src/lib/format-date";
import { todayInMoscow } from "../src/lib/moscow-date";
import { firstOfNextMonth } from "../src/server/rules/stipend";

import { loginAs } from "./auth";
import { controlDatesOf, currentAssessmentOf, debtOf, disconnect } from "./helpers/db";

test.afterAll(async () => {
  await disconnect();
});

test("alina: /study показывает задолженность и прекращение стипендии", async ({ page }) => {
  const debt = await debtOf("alina");
  await loginAs(page, "alina");
  await page.goto("/study");
  const summary = page.getByTestId("debts-summary");
  await expect(summary).toContainText("Академических задолженностей: 1");
  await expect(summary).toContainText(
    `ликвидировать до ${formatDateKeySmart(debt.deadline, todayInMoscow())}`,
  );
  await expect(page.getByTestId("stipend-status")).toContainText(
    `не выплачивается с ${formatDateKeySmart(firstOfNextMonth(debt.formedAt), todayInMoscow())}`,
  );
  await expect(page.getByTestId("raised-window")).toBeVisible();
  // По умолчанию последний семестр с результатами; задолженность выделена текстом.
  await expect(page.locator('[data-debt="true"]')).toContainText("Задолженность");
});

test("alina: S3a задолженности — этап I, попытка, срок, пересдача; чип раскрывает цитату", async ({
  page,
}) => {
  const debt = await debtOf("alina");
  await loginAs(page, "alina");
  await page.goto(`/study/${debt.assessmentId}`);
  await expect(page.locator('[data-step="STAGE_1"]')).toHaveAttribute("aria-current", "step");
  await expect(page.getByTestId("attempt")).toHaveText("1 из 2");
  await expect(page.getByTestId("deadline")).toHaveText(
    formatDateKeySmart(debt.deadline, todayInMoscow()),
  );
  await expect(page.getByTestId("retake-date")).toHaveText(formatDayTime(debt.retakeAt));

  const quote = page
    .getByTestId("debt-timeline")
    .locator('[data-testid="norm-quote"][data-code="N-10"]');
  await expect(quote.locator("blockquote")).toBeHidden();
  await quote.getByLabel("426общ, п. 7.4: показать цитату").click();
  await expect(quote.locator("blockquote")).toContainText("7.4 Повторная промежуточная аттестация");
  await expect(quote.getByRole("link", { name: "Открыть в «Почему так»" })).toHaveAttribute(
    "href",
    "/why#N-10",
  );
  await expect(page.getByRole("link", { name: "Пересдача в расписании" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Не смогу прийти" })).toHaveAttribute(
    "href",
    /^\/cant-attend\?event=c[a-z0-9]+$/,
  );
});

test("alina: дисциплина текущего семестра — сценарии, включая «удовлетворительно» со стипендией", async ({
  page,
}) => {
  const exam = await currentAssessmentOf("alina", "EXAM");
  await loginAs(page, "alina");
  await page.goto(`/study/${exam.id}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(exam.discipline);
  const ids = await page
    .getByTestId("scenario")
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-scenario")));
  expect(ids).toEqual(["satisfactory", "no-show", "valid-reason"]);
  await expect(page.locator('[data-scenario="satisfactory"]')).toContainText("стипенди");
});

test("denis: /study без стипендии и сценариев о ней, пустое состояние с датами зачётов", async ({
  page,
}) => {
  const dates = await controlDatesOf("denis");
  await loginAs(page, "denis");
  await page.goto("/study");
  await expect(page.getByTestId("no-results")).toHaveText(
    "Результатов пока нет: первая сессия в декабре",
  );
  await expect(page.getByTestId("stipend-summary")).toHaveCount(0);
  const main = page.locator("main");
  await expect(main).not.toContainText("стипенди");
  for (const d of dates) await expect(main).toContainText(formatDayTime(d));

  const credit = await currentAssessmentOf("denis", "CREDIT");
  await page.goto(`/study/${credit.id}`);
  await expect(main).not.toContainText("стипенди");
  await expect(page.locator('[data-scenario="satisfactory"]')).toHaveCount(0);
});

test("/why: поиск по «7.3» находит N-09, «Где используется» не пустое", async ({ page }) => {
  await loginAs(page, "alina");
  await page.goto("/why");
  await page.getByLabel("Поиск по документу, пункту или тексту").fill("7.3");
  const n09 = page.locator("#N-09");
  await expect(n09).toBeVisible();
  await expect(n09.getByTestId("used-in")).toContainText("Где используется:");
  await expect(n09.getByTestId("used-in")).not.toHaveText("Где используется:");
  await expect(page.locator("#N-29")).toHaveCount(0);
  await page.getByLabel("Поиск по документу, пункту или тексту").fill("нет-такой-нормы");
  await expect(page.getByText("Ничего не найдено. Попробуйте другой запрос.")).toBeVisible();
});

test("чип нормы ведёт к нужной норме: прокрутка и подсветка, на экране нет кода N-xx", async ({
  page,
}) => {
  const debt = await debtOf("alina");
  await loginAs(page, "alina");
  await page.goto(`/study/${debt.assessmentId}`);
  const quote = page
    .getByTestId("debt-timeline")
    .locator('[data-testid="norm-quote"][data-code="N-10"]');
  await expect(quote.locator("summary")).toHaveText("426общ, п. 7.4");
  await quote.locator("summary").click();
  await quote.getByRole("link", { name: "Открыть в «Почему так»" }).click();
  await expect(page).toHaveURL(/\/why#N-10$/);
  const target = page.locator("#N-10");
  await expect(target).toHaveAttribute("data-flash", "true");
  await expect(target).toBeInViewport();
  await expect(target.getByRole("heading")).toHaveText("426общ, п. 7.4");
  await expect(page.locator("main")).not.toContainText(/\bN-\d+\b/);
  // Подсветка гаснет через пару секунд.
  await expect(target).not.toHaveAttribute("data-flash", "true", { timeout: 5000 });
});

test("вход в «Что будет, если…» заметен с карточки дисциплины с долгом", async ({ page }) => {
  await loginAs(page, "alina");
  await page.goto("/study");
  await expect(page.getByTestId("debt-what-if")).toBeVisible();
  const debtCard = page.locator('[data-testid="discipline"][data-debt="true"]').first();
  await expect(debtCard.getByTestId("what-if-entry")).toHaveText("Что будет, если…");
  await debtCard.click();
  await expect(page.getByTestId("debt-timeline")).toBeVisible();
});
