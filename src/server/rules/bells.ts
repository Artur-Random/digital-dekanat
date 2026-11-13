// Расписание звонков МГПУ. Источник: документ «Расписание звонков», передан Кириллом
// 13.11.2026. Пары по 80 минут. Это данные вуза, а не допущение прототипа.

export type Bell = { readonly pair: number; readonly start: string; readonly end: string };

export const BELLS: readonly Bell[] = [
  { pair: 1, start: "09:00", end: "10:20" },
  { pair: 2, start: "10:30", end: "11:50" },
  { pair: 3, start: "12:40", end: "14:00" },
  { pair: 4, start: "14:10", end: "15:30" },
  { pair: 5, start: "15:40", end: "17:00" },
  { pair: 6, start: "17:10", end: "18:30" },
  { pair: 7, start: "18:40", end: "20:00" },
  { pair: 8, start: "20:10", end: "21:30" },
];

export function bellByPair(pair: number): Bell {
  const bell = BELLS.find((b) => b.pair === pair);
  if (!bell) throw new Error(`Нет пары с номером ${pair}`);
  return bell;
}

/** Номер пары по времени начала и конца «ЧЧ:ММ»; null, если время не на сетке звонков. */
export function pairOf(start: string, end?: string): number | null {
  const bell = BELLS.find((b) => b.start === start && (end === undefined || b.end === end));
  return bell ? bell.pair : null;
}
