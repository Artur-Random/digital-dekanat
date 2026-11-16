// Сквозной сценарий заявки (замечания Максима #23, #24): студент подаёт → сотрудник меняет
// статус → отказ без причины невозможен → отказ с причиной → студент видит статус и уведомление.
// Проект flows идёт после основного набора и перед lockout; в конце штатный сброс демо-данных
// (npm run demo:reset) убирает поданные заявки. Только локально: на развёрнутом сайте запрещено.

import { execSync } from "node:child_process";

import { type Browser, type Page, expect, test } from "@playwright/test";

import { loginAs } from "../auth";
import { BASE_URL } from "../base-url";

test.describe.configure({ mode: "serial" });

const isLocal = ["localhost", "127.0.0.1"].includes(new URL(BASE_URL).hostname);
test.skip(!isLocal, "Сценарии с изменением данных только на локальном стенде");

const created: string[] = [];

test.afterAll(() => {
  // Вывод сброса не печатаем: там только счётчики, но лишнего в логах не нужно.
  if (created.length > 0) execSync("npm run demo:reset", { stdio: "ignore" });
});

async function asUser(browser: Browser, login: "alina" | "dekanat" | "mfc"): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginAs(page, login);
  return page;
}

function idFromUrl(page: Page): string {
  const id = new URL(page.url()).pathname.split("/").pop() ?? "";
  expect(id).toMatch(/^c[a-z0-9]{20,}$/);
  return id;
}

test("продление аттестации: подача → рассмотрение → отказ с причиной → уведомление", async ({
  browser,
}) => {
  const REASON = "Справка не подтверждает даты отсутствия.";

  // 1. Студент подаёт заявление через «Новая заявка» → «Не смогу прийти».
  const alina = await asUser(browser, "alina");
  await alina.goto("/applications");
  await alina.getByTestId("new-application").click();
  await expect(alina).toHaveURL(/\/applications\/new$/);
  await alina.locator('[data-testid="catalog-item"][data-code="PA_EXTENSION"]').click();
  await expect(alina).toHaveURL(/\/cant-attend$/);

  // Пустая форма не отправляется: ошибки по полям.
  await alina.getByRole("button", { name: "Отправить заявление о продлении" }).click();
  await expect(alina.getByTestId("error-eventId")).toBeVisible();
  await expect(alina.getByTestId("error-reason")).toBeVisible();
  await expect(alina.getByTestId("form-message")).toContainText("проверьте отмеченные поля");

  const candidate = alina
    .locator('[data-testid="absence-candidate"][data-expired="false"]')
    .first();
  await expect(candidate).toContainText("Сообщите до");
  const day = (await candidate.getAttribute("data-day")) ?? "";
  await candidate.locator('input[type="radio"]').check();
  await alina.getByRole("radio", { name: /Болезнь/ }).check();
  await alina.getByLabel("Первый день", { exact: true }).fill(day);
  await alina.getByLabel("Последний день", { exact: true }).fill(day);
  await alina.getByRole("checkbox", { name: /Оригинал документа принесу/ }).check();
  await alina.getByRole("button", { name: "Отправить заявление о продлении" }).click();

  await expect(alina.getByTestId("created-banner")).toBeVisible();
  const id = idFromUrl(alina);
  created.push(id);
  await expect(alina.getByTestId("application-status")).toHaveText("Подано");
  await expect(alina.getByRole("button", { name: "Отменить заявку" })).toBeVisible();

  // 2. Деканат видит заявление в очереди и берёт на рассмотрение.
  const dekanat = await asUser(browser, "dekanat");
  await dekanat.goto("/staff");
  await expect(dekanat.locator(`a[href="/staff/applications/${id}"]`)).toBeVisible();
  await dekanat.goto(`/staff/applications/${id}`);
  await expect(dekanat.getByTestId("application-student")).toContainText("Морозова Алина");
  await dekanat.getByRole("button", { name: "Взять на рассмотрение" }).click();
  await expect(dekanat.getByTestId("changed-banner")).toBeVisible();
  await expect(dekanat.getByTestId("application-status")).toHaveText("На рассмотрении");

  // 3. Отказ без причины невозможен.
  await dekanat.getByRole("button", { name: "Отказать" }).click();
  await expect(dekanat.getByTestId("error-comment")).toContainText("укажите причину");
  await dekanat.reload();
  await expect(dekanat.getByTestId("application-status")).toHaveText("На рассмотрении");

  // 4. Отказ с причиной.
  await dekanat.getByLabel(/Комментарий студенту/).fill(REASON);
  await dekanat.getByRole("button", { name: "Отказать" }).click();
  await expect(dekanat.getByTestId("changed-banner")).toContainText("Отказ");
  await expect(dekanat.getByTestId("application-status")).toHaveText("Отказ");
  await expect(dekanat.getByTestId("no-actions")).toBeVisible();

  // 5. Студент видит новый статус, причину и уведомление; отменить уже нельзя.
  await alina.goto(`/applications/${id}`);
  await expect(alina.getByTestId("application-status")).toHaveText("Отказ");
  await expect(alina.locator("main")).toContainText(REASON);
  await expect(alina.getByRole("button", { name: "Отменить заявку" })).toHaveCount(0);
  await alina.goto("/notifications");
  const notice = alina.getByTestId("notification").filter({ hasText: REASON });
  await expect(notice).toBeVisible();
  await expect(notice).toHaveAttribute("data-read", "false");
  await expect(notice).toContainText("Отказ");
  await notice.click();
  await expect(alina).toHaveURL(new RegExp(`/applications/${id}$`));
});

test("справка: подача, отмена до взятия в работу, затем в архиве", async ({ browser }) => {
  const alina = await asUser(browser, "alina");
  await alina.goto("/applications/new");
  await alina.locator('[data-testid="catalog-item"][data-code="CERT_GRADES"]').click();
  await expect(alina.getByTestId("preview-MAIN")).toContainText("так устроено в прототипе");
  await alina.getByLabel("Куда нужна справка").fill("По месту требования");
  await alina.getByLabel("Сколько экземпляров").fill("2");
  await alina.getByRole("button", { name: "Заказать справку" }).click();
  await expect(alina.getByTestId("created-banner")).toBeVisible();
  const id = idFromUrl(alina);
  created.push(id);
  await expect(alina.getByTestId("stage-deadline")).toBeVisible();

  // Подтверждение в модальном окне: Escape и «Не отменять» ничего не меняют.
  const trigger = alina.getByRole("button", { name: "Отменить заявку" });
  const dialog = alina.getByTestId("cancel-dialog");
  await trigger.click();
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Отменить заявку?");
  await expect(dialog).toContainText("Это действие нельзя вернуть.");
  await expect(dialog.getByRole("button", { name: "Не отменять" })).toBeFocused();
  await alina.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("button", { name: "Не отменять" }).click();
  await expect(dialog).toBeHidden();
  await expect(alina.getByTestId("application-status")).toHaveText("Подано");
  await trigger.click();
  await dialog.getByRole("button", { name: "Отменить заявку" }).click();
  await expect(alina.getByTestId("application-status")).toHaveText("Отменено");
  await alina.goto("/applications");
  await expect(
    alina.getByTestId("applications-archive").locator(`a[href="/applications/${id}"]`),
  ).toBeVisible();

  // Отменённую заявку МФЦ видит закрытой, без кнопок.
  const mfc = await asUser(browser, "mfc");
  await mfc.goto(`/staff/applications/${id}`);
  await expect(mfc.getByTestId("no-actions")).toBeVisible();
});

test("академический отпуск без документов: ветка через комиссию, отказ со ссылкой на N-46", async ({
  browser,
}) => {
  const alina = await asUser(browser, "alina");
  await alina.goto("/applications/new/ACADEMIC_LEAVE");
  await alina.getByRole("radio", { name: "Семейные обстоятельства" }).check();
  await expect(alina.getByTestId("leave-branch")).toContainText("Передано в комиссию");
  // Галочку о документах не ставим: в FormData её ключа нет (баг, найденный ui-reviewer).
  await alina.getByLabel("Срок отпуска, месяцев").fill("6");
  await alina.getByRole("button", { name: "Подать заявление" }).click();
  await expect(alina.getByTestId("created-banner")).toBeVisible();
  const id = idFromUrl(alina);
  created.push(id);
  await expect(alina.locator('[data-stage="SENT_TO_COMMISSION"]')).toContainText("Срок: до");

  const mfc = await asUser(browser, "mfc");
  await mfc.goto(`/staff/applications/${id}`);
  await mfc.getByRole("button", { name: "Передать в комиссию" }).click();
  await expect(mfc.getByTestId("application-status")).toHaveText("Передано в комиссию");
  await expect(mfc.getByRole("button", { name: "Отказать" })).toBeVisible();
  await expect(
    mfc.getByTestId("status-actions").locator("xpath=..").getByText("754общ, п. 2.14"),
  ).toBeVisible();
});

test("лимит: не больше 5 активных заявок, проверка и на сервере", async ({ browser }) => {
  const LIMIT_TEXT =
    "Можно иметь не больше 5 активных заявок. Дождитесь решения или отмените одну из них.";
  const alina = await asUser(browser, "alina");
  await alina.goto("/applications");
  const activeRows = alina.getByTestId("applications-active").getByTestId("application-row");
  const active = await activeRows.count();
  expect(active).toBeLessThan(5);

  // Вторая вкладка с формой, открытой до достижения лимита: её отправка проверит сервер.
  const stale = await alina.context().newPage();
  await stale.goto("/applications/new/CERT_SUMMONS");

  async function orderCertificate() {
    await alina.goto("/applications/new/CERT_GRADES");
    await alina.getByLabel("Куда нужна справка").fill("По месту требования");
    await alina.getByRole("button", { name: "Заказать справку" }).click();
    await expect(alina.getByTestId("created-banner")).toBeVisible();
    created.push(idFromUrl(alina));
  }
  for (let i = active; i < 5; i++) await orderCertificate();

  await alina.goto("/applications");
  const button = alina.getByTestId("new-application");
  await expect(button).toHaveAttribute("aria-disabled", "true");
  await expect(button).not.toHaveAttribute("href", /.*/);
  await expect(alina.getByTestId("application-limit")).toContainText(LIMIT_TEXT);
  await expect(alina.getByTestId("application-limit")).toContainText("так устроено в прототипе");
  await alina.goto("/applications/new");
  await expect(alina.getByTestId("application-limit")).toContainText(LIMIT_TEXT);
  await expect(alina.getByTestId("catalog-item")).toHaveCount(0);

  // Сервер не принимает шестую заявку, даже если форма уже была открыта.
  await stale.getByLabel("Куда нужна справка").fill("По месту требования");
  await stale.getByRole("button", { name: "Заказать справку" }).click();
  await expect(stale.getByTestId("form-message")).toHaveText(LIMIT_TEXT);
  await expect(stale).toHaveURL(/\/applications\/new\/CERT_SUMMONS$/);
});
