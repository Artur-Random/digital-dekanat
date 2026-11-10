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
