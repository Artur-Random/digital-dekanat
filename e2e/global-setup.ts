// Очистка попыток входа демо-аккаунтов до и после прогона, вне параллельных тестов.
// Раньше её делал afterAll в access.spec.ts, и она удаляла запись попытки, которую в этот момент
// обновлял вход в другом тесте (гонка, задачи 6в и 7). Против развёрнутого сайта не выполняется.

import { BASE_URL } from "./base-url";
import { clearLoginAttempts, disconnect } from "./helpers/db";

const LOGINS = ["alina", "denis", "mfc", "dekanat", "no-such-user"];

export function isLocalRun(): boolean {
  return ["localhost", "127.0.0.1"].includes(new URL(BASE_URL).hostname);
}

export async function clearDemoLoginAttempts(): Promise<void> {
  if (!isLocalRun() || !process.env.DATABASE_URL) return;
  for (const login of LOGINS) await clearLoginAttempts(login);
  await disconnect();
}

export default async function globalSetup(): Promise<void> {
  await clearDemoLoginAttempts();
}
