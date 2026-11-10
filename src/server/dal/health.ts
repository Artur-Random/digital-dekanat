import "server-only";

import { getDb } from "@/server/db";

/** Проверка доступности базы. Детали ошибки наружу не отдаём, только в серверный лог. */
export async function isDatabaseReachable(): Promise<boolean> {
  try {
    await getDb().$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("health: база недоступна:", error instanceof Error ? error.name : "unknown");
    return false;
  }
}
