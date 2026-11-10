// Рабочие дни по производственному календарю (X-2). Субботы и воскресенья нерабочие
// по умолчанию. Исключения берутся из таблицы Holiday: нерабочие будни (праздники и
// перенесённые выходные) и рабочие выходные (перенос рабочего дня на субботу).

import { type DateKey, addDays, weekday } from "@/lib/moscow-date";

export type ProductionCalendar = {
  /** Будни, которые не работают. */
  readonly nonWorking: ReadonlySet<DateKey>;
  /** Суббота или воскресенье, которые работают. */
  readonly working: ReadonlySet<DateKey>;
};

export function buildCalendar(
  entries: readonly { date: DateKey; isWorkingDay: boolean }[],
): ProductionCalendar {
  return {
    nonWorking: new Set(entries.filter((e) => !e.isWorkingDay).map((e) => e.date)),
    working: new Set(entries.filter((e) => e.isWorkingDay).map((e) => e.date)),
  };
}

export function isWorkingDay(key: DateKey, calendar: ProductionCalendar): boolean {
  if (calendar.working.has(key)) return true;
  if (calendar.nonWorking.has(key)) return false;
  const day = weekday(key);
  return day !== 0 && day !== 6;
}

function assertCount(n: number): void {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`Число рабочих дней должно быть целым и неотрицательным: ${n}`);
  }
}

/**
 * Дата, наступающая через n рабочих дней ПОСЛЕ start (сам start не считается).
 * Пример: событие в пятницу, n = 3 → среда (без праздников).
 */
export function addWorkingDays(start: DateKey, n: number, calendar: ProductionCalendar): DateKey {
  assertCount(n);
  let current = start;
  let left = n;
  while (left > 0) {
    current = addDays(current, 1);
    if (isWorkingDay(current, calendar)) left--;
  }
  return current;
}

/** Дата за n рабочих дней ДО start. Нужна сиду, чтобы ставить даты «столько-то рабочих дней назад». */
export function subtractWorkingDays(
  start: DateKey,
  n: number,
  calendar: ProductionCalendar,
): DateKey {
  assertCount(n);
  let current = start;
  let left = n;
  while (left > 0) {
    current = addDays(current, -1);
    if (isWorkingDay(current, calendar)) left--;
  }
  return current;
}
