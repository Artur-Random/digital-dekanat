import { formatMoscowIso } from "@/lib/moscow-date";
import { checkHealth } from "@/server/dal/health";

// Публичный служебный маршрут без данных пользователей, поэтому guard не нужен.
// Отдаёт только состояние базы, версию сборки и время последнего сброса демо-данных.
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const version = process.env.APP_VERSION || "dev";
  const health = await checkHealth();
  if (!health.db) {
    return Response.json({ status: "error", db: "error", version }, { status: 503 });
  }
  return Response.json({
    status: "ok",
    db: "ok",
    version,
    demoResetAt: health.lastDemoResetAt ? formatMoscowIso(health.lastDemoResetAt) : null,
  });
}
