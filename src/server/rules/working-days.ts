// Рабочие дни по производственному календарю (X-2). Субботы и воскресенья нерабочие
// по умолчанию, праздники и перенесённые выходные берутся из таблицы Holiday.

import { type DateKey, addDays, weekday } from "@/lib/moscow-date";

export type NonWorkingDays = ReadonlySet<DateKey>;

export function isWorkingDay(key: DateKey, holidays: NonWorkingDays): boolean {
  const day = weekday(key);
  if (day === 0 || day === 6) return false;
  return !holidays.has(key);
}

/**
 * Дата, наступающая через n рабочих дней ПОСЛЕ start (сам start не считается).
 * Пример: событие в пятницу, n = 3 → среда (без праздников).
 */
export function addWorkingDays(start: DateKey, n: number, holidays: NonWorkingDays): DateKey {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`Число рабочих дней должно быть целым и неотрицательным: ${n}`);
  }
  let current = start;
  let left = n;
  while (left > 0) {
    current = addDays(current, 1);
    if (isWorkingDay(current, holidays)) left--;
  }
  return current;
}

/** Дата за n рабочих дней ДО start. Нужна сиду, чтобы ставить даты «столько-то рабочих дней назад». */
export function subtractWorkingDays(start: DateKey, n: number, holidays: NonWorkingDays): DateKey {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`Число рабочих дней должно быть целым и неотрицательным: ${n}`);
  }
  let current = start;
  let left = n;
  while (left > 0) {
    current = addDays(current, -1);
    if (isWorkingDay(current, holidays)) left--;
  }
  return current;
}
