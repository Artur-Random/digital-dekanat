import "server-only";

import { z } from "zod";

import { isDateKey } from "@/lib/moscow-date";
import type { StaffActor } from "@/server/auth/guards";
import type { DbTx } from "@/server/dal/client";
import { type ScheduleChangeResult, applyScheduleChange } from "@/server/dal/schedule";
import { BELLS } from "@/server/rules/bells";

// Изменение пары: используется сидом демо-данных и будущим экраном E3 (задание 7).
// Вход проверяется zod, правила (N-15, сетка звонков, рабочий день) — в rules/schedule-change,
// запись и уведомления — в одной транзакции в DAL.

const patchSchema = z
  .object({
    date: z.string().refine(isDateKey, "Неверная дата").optional(),
    pair: z
      .number()
      .int()
      .refine((n) => BELLS.some((b) => b.pair === n), "Нет такой пары")
      .optional(),
    roomId: z.cuid().optional(),
    teacherId: z.cuid().optional(),
    format: z.enum(["OFFLINE", "ONLINE"]).optional(),
    cancel: z.boolean().optional(),
  })
  .strict();

const inputSchema = z.object({
  eventId: z.cuid(),
  patch: patchSchema,
  reason: z.string().trim().min(3).max(300),
});

export type ScheduleChangeRequest = z.input<typeof patchSchema>;

export async function createScheduleChange(
  actor: StaffActor,
  eventId: string,
  patch: ScheduleChangeRequest,
  reason: string,
  options: { now?: Date; tx?: DbTx } = {},
): Promise<ScheduleChangeResult> {
  const input = inputSchema.parse({ eventId, patch, reason });
  return applyScheduleChange(actor, input, options);
}
