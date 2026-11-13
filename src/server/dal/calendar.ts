import "server-only";

import { type ProductionCalendar, buildCalendar } from "@/server/rules/working-days";

import type { DbTx } from "./client";

// Производственный календарь — справочник, не данные пользователя. Принимает клиент базы,
// поэтому вне DAL её вызвать нечем: снаружи календарь приходит из функций с actor.
export async function loadCalendar(client: DbTx): Promise<ProductionCalendar> {
  const rows = await client.holiday.findMany({ select: { date: true, isWorkingDay: true } });
  // @db.Date хранится как полночь UTC: берём календарную дату из ISO.
  return buildCalendar(
    rows.map((r) => ({ date: r.date.toISOString().slice(0, 10), isWorkingDay: r.isWorkingDay })),
  );
}
