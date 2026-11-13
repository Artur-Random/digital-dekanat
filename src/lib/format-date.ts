// Отображение дат и времени всегда в Europe/Moscow: «18 ноября», «10:10».

const dayMonth = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Europe/Moscow",
  day: "numeric",
  month: "long",
});

const time = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Europe/Moscow",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatDay(date: Date): string {
  return dayMonth.format(date);
}

export function formatTime(date: Date): string {
  return time.format(date);
}

export function formatDayTime(date: Date): string {
  return `${formatDay(date)}, ${formatTime(date)}`;
}

/** Колонки @db.Date хранятся как полночь UTC: показываем ту же календарную дату. */
export function formatDateOnly(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
  }).format(date);
}

const weekdayShort = new Intl.DateTimeFormat("ru-RU", { timeZone: "UTC", weekday: "short" });
const weekdayLong = new Intl.DateTimeFormat("ru-RU", { timeZone: "UTC", weekday: "long" });
const dayMonthUtc = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
});

/** Календарная дата «ГГГГ-ММ-ДД» → «18 ноября». */
export function formatDateKey(key: string): string {
  return dayMonthUtc.format(new Date(`${key}T12:00:00Z`));
}

/** «ГГГГ-ММ-ДД» → «пт, 20 ноября». */
export function formatDateKeyShort(key: string): string {
  const d = new Date(`${key}T12:00:00Z`);
  return `${weekdayShort.format(d)}, ${dayMonthUtc.format(d)}`;
}

/** «ГГГГ-ММ-ДД» → «Пятница, 20 ноября». */
export function formatDateKeyLong(key: string): string {
  const d = new Date(`${key}T12:00:00Z`);
  const day = weekdayLong.format(d);
  return `${day.charAt(0).toUpperCase()}${day.slice(1)}, ${dayMonthUtc.format(d)}`;
}

/** Место пары: «пт, 20 ноября, 3 пара (12:40)». */
export function formatSlot(slot: { date: string; pair: number | null; start: string }): string {
  const pair = slot.pair === null ? "" : `, ${slot.pair} пара`;
  return `${formatDateKeyShort(slot.date)}${pair} (${slot.start})`;
}

/** 1 день, 2 дня, 5 дней. */
export function pluralDays(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} день`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} дня`;
  return `${n} дней`;
}

const dayMonthYearUtc = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** «ГГГГ-ММ-ДД» → «15 июня 2027» (без «г.»). */
export function formatDateKeyWithYear(key: string): string {
  return dayMonthYearUtc.format(new Date(`${key}T12:00:00Z`)).replace(/\s*г\.$/, "");
}

/** «18 ноября» в текущем году, «15 июня 2027» — в другом (формат CLAUDE.md, год только по делу). */
export function formatDateKeySmart(key: string, today: string): string {
  return key.slice(0, 4) === today.slice(0, 4) ? formatDateKey(key) : formatDateKeyWithYear(key);
}
