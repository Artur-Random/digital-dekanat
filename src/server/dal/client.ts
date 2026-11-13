import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/server/db";

/** Клиент внутри транзакции. Сервисы передают его, чтобы сброс демо шёл одной транзакцией. */
export type DbTx = Prisma.TransactionClient;

/** Выполнить fn в переданной транзакции или открыть новую. */
export async function inTransaction<T>(
  tx: DbTx | undefined,
  fn: (tx: DbTx) => Promise<T>,
): Promise<T> {
  return tx ? fn(tx) : getDb().$transaction(fn);
}
