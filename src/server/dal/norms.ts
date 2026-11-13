import "server-only";

import type { SessionUser } from "@/server/auth/session";
import { getDb } from "@/server/db";

/** Нормы реестра для «Почему так» (S8). Справочник, доступен любому вошедшему пользователю. */
export async function listNorms(actor: SessionUser) {
  void actor; // Вызывающий обязан пройти requireUser(); данных пользователя здесь нет.
  const rows = await getDb().norm.findMany({
    select: { code: true, document: true, clause: true, page: true, quote: true },
  });
  return rows.sort((a, b) => Number(a.code.replace(/\D/g, "")) - Number(b.code.replace(/\D/g, "")));
}
