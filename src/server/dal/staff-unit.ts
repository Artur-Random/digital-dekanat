import "server-only";

import type { StaffActor } from "@/server/auth/guards";
import { ScheduleDomainError } from "@/server/rules/schedule-change";

import type { DbTx } from "./client";

/**
 * Расписание и объявления ведёт деканат (spec, E3 и E4). Сотрудник другого подразделения
 * получает ту же ошибку, что и при несуществующей паре: не подтверждаем, что она есть.
 */
export async function requireDekanat(tx: DbTx, actor: StaffActor): Promise<void> {
  const unit = await tx.unit.findUnique({ where: { id: actor.unitId }, select: { code: true } });
  if (unit?.code !== "DEKANAT") throw new ScheduleDomainError("NOT_FOUND", "Не найдено.");
}
