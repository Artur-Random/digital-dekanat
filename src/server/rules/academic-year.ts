// Границы дат: текущий учебный год (1 сентября – 31 августа) и допустимый период для полей дат.
// Чистые функции без доступа к данным.

import { type DateKey, isDateKey } from "@/lib/moscow-date";

import { addCalendarYear } from "./debts";

/** Учебный год, в который попадает день: с 1 сентября по 31 августа. */
export function academicYear(today: DateKey): { start: DateKey; end: DateKey } {
  const year = Number(today.slice(0, 4));
  const startYear = Number(today.slice(5, 7)) >= 9 ? year : year - 1;
  return { start: `${startYear}-09-01`, end: `${startYear + 1}-08-31` };
}

/**
 * Допустимые даты в формах (даты отсутствия и т. п.): не раньше начала текущего учебного года
 * и не позже чем через календарный год от сегодня (решение Кирилла 18.11, так устроено в прототипе).
 */
export function formDateBounds(today: DateKey): { min: DateKey; max: DateKey } {
  return { min: academicYear(today).start, max: addCalendarYear(today) };
}

export function isWithin(key: string, bounds: { min: DateKey; max: DateKey }): boolean {
  return isDateKey(key) && key >= bounds.min && key <= bounds.max;
}
