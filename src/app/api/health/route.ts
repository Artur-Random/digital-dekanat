import { isDatabaseReachable } from "@/server/dal/health";

// Публичный служебный маршрут без данных пользователей, поэтому guard не нужен.
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const ok = await isDatabaseReachable();
  if (ok) {
    return Response.json({ status: "ok", db: "ok" });
  }
  return Response.json({ db: "error" }, { status: 503 });
}
