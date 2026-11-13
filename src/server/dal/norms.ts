import "server-only";

import { getDb } from "@/server/db";

/** Нормы реестра для «Почему так» (S8) и чипов с цитатой. Справочник, доступен любому вошедшему. */
export async function listNorms(actor: { userId: string }, codes?: readonly string[]) {
  void actor; // Вызывающий обязан пройти guard; данных пользователя здесь нет.
  const rows = await getDb().norm.findMany({
    where: codes ? { code: { in: [...codes] } } : undefined,
    select: { code: true, document: true, clause: true, page: true, quote: true, usedIn: true },
  });
  return rows.sort((a, b) => Number(a.code.replace(/\D/g, "")) - Number(b.code.replace(/\D/g, "")));
}

export type NormView = Awaited<ReturnType<typeof listNorms>>[number];
