// «Учёба» (S3), «Что будет, если…» (S3a) и поиск в «Почему так» (S8), задание 5.
// Ожидаемые даты вычисляются из базы, а не захардкожены.

import { expect, test } from "@playwright/test";

import { formatDateKeyWithYear, formatDayTime } from "../src/lib/format-date";
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
  await expect(summary).toContainText(`ликвидировать до ${formatDateKeyWithYear(debt.deadline)}`);
  await expect(page.getByTestId("stipend-status")).toContainText(
    `не выплачивается с ${formatDateKeyWithYear(firstOfNextMonth(debt.formedAt))}`,
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
  await expect(page.getByTestId("deadline")).toHaveText(formatDateKeyWithYear(debt.deadline));
  await expect(page.getByTestId("retake-date")).toHaveText(formatDayTime(debt.retakeAt));

  const quote = page
    .getByTestId("debt-timeline")
    .locator('[data-testid="norm-quote"][data-code="N-10"]');
  await expect(quote.locator("blockquote")).toBeHidden();
  await quote.getByLabel("Норма N-10: показать цитату").click();
  await expect(quote.locator("blockquote")).toContainText("7.4 Повторная промежуточная аттестация");
  await expect(quote.getByRole("link", { name: "Открыть в «Почему так»" })).toHaveAttribute(
    "href",
    "/why#N-10",
  );
  await expect(page.getByRole("link", { name: "Пересдача в расписании" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Не смогу прийти" })).toHaveAttribute(
    "href",
    "/cant-attend",
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
  await expect(page.locator('[data-scenario="satisfactory"]')).toContainText("стипендия");
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
  await page.getByLabel("Поиск по коду, документу или тексту").fill("7.3");
  const n09 = page.locator("#N-09");
  await expect(n09).toBeVisible();
  await expect(n09.getByTestId("used-in")).toContainText("Где используется:");
  await expect(n09.getByTestId("used-in")).not.toHaveText("Где используется:");
  await expect(page.locator("#N-29")).toHaveCount(0);
  await page.getByLabel("Поиск по коду, документу или тексту").fill("нет-такой-нормы");
  await expect(page.getByText("Ничего не найдено. Попробуйте другой запрос.")).toBeVisible();
});
