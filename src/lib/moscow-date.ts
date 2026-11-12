// Даты по Москве. Календарная дата хранится строкой «ГГГГ-ММ-ДД», чтобы не зависеть
// от часового пояса сервера. В Москве нет перехода на летнее время, смещение всегда +03:00.

export type DateKey = string;

const MOSCOW_OFFSET = "+03:00";

export function toDateKey(date: Date): DateKey {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return parts;
}

export function todayInMoscow(now: Date = new Date()): DateKey {
  return toDateKey(now);
}

function assertDateKey(key: DateKey): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    throw new Error(`Неверная дата: ${key}`);
  }
}

/** Календарное сложение дней. Считаем в UTC-полдень, чтобы не попасть на границу суток. */
export function addDays(key: DateKey, days: number): DateKey {
  assertDateKey(key);
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 — воскресенье, 6 — суббота. */
export function weekday(key: DateKey): number {
  assertDateKey(key);
  return new Date(`${key}T12:00:00Z`).getUTCDay();
}

/** Момент времени: дата по Москве и время «ЧЧ:ММ» по Москве. */
export function moscowDateTime(key: DateKey, time = "12:00"): Date {
  assertDateKey(key);
  return new Date(`${key}T${time}:00${MOSCOW_OFFSET}`);
}

/** Дата для колонок @db.Date: полночь UTC той же календарной даты. */
export function dateOnly(key: DateKey): Date {
  assertDateKey(key);
  return new Date(`${key}T00:00:00Z`);
}

/** Момент времени по Москве в ISO-формате со смещением: «2026-11-12T04:00:05+03:00». */
export function formatMoscowIso(date: Date): string {
  const shifted = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  return `${shifted.toISOString().slice(0, 19)}${MOSCOW_OFFSET}`;
}
