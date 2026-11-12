import "server-only";

import { getDb } from "@/server/db";

export type HealthState = { db: boolean; lastDemoResetAt: Date | null };

/**
 * Проверка базы для публичного /api/health: SELECT 1 и время последнего сброса демо-данных.
 * Детали ошибки наружу не отдаём, только имя ошибки в серверный лог.
 */
export async function checkHealth(): Promise<HealthState> {
  try {
    const db = getDb();
    await db.$queryRaw`SELECT 1`;
    const last = await db.demoReset.findFirst({
      orderBy: { finishedAt: "desc" },
      select: { finishedAt: true },
    });
    return { db: true, lastDemoResetAt: last?.finishedAt ?? null };
  } catch (error) {
    console.error("health: база недоступна:", error instanceof Error ? error.name : "unknown");
    return { db: false, lastDemoResetAt: null };
  }
}
