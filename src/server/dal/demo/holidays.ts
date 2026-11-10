// Производственный календарь 2026–2027 (X-2): нерабочие дни, выпадающие на будни.
// Субботы и воскресенья нерабочие по умолчанию и здесь не перечисляются.
//
// Источники:
// - ТК РФ, ст. 112: нерабочие праздничные дни 1–6 и 8 января (новогодние каникулы), 7 января,
//   23 февраля, 8 марта, 1 мая, 9 мая, 12 июня, 4 ноября. Праздник в выходной переносится
//   на следующий рабочий день (кроме январских).
// - 2026: постановление Правительства РФ от 24.09.2025 № 1466: выходные 3 и 4 января
//   перенесены на 9 января и 31 декабря.
// - 2027: постановление Правительства РФ от 17.09.2026 № 1187: выходные 2 и 3 января
//   перенесены на 5 ноября и 31 декабря; выходной с субботы 20 февраля на понедельник 22 февраля.
//
// TODO(Кирилл): тексты постановлений не открылись из среды разработки (сайты правовых систем
// недоступны), переносы взяты из совпадающих выдержек нескольких источников. Сверить с
// publication.pravo.gov.ru.
// Суббота 20.02.2027 по постановлению № 1187 рабочая (решение Кирилла от 10.11:
// признак isWorkingDay в Holiday).

import type { HolidayKind } from "@/generated/prisma/client";

export type HolidaySeed = {
  date: string;
  kind: HolidayKind;
  isWorkingDay: boolean;
  source: string;
};

const TK = "ТК РФ, ст. 112";
const P2026 = "Постановление Правительства РФ от 24.09.2025 № 1466";
const P2027 = "Постановление Правительства РФ от 17.09.2026 № 1187";

export const HOLIDAYS: readonly HolidaySeed[] = [
  // 2026
  { date: "2026-01-01", kind: "PUBLIC_HOLIDAY", isWorkingDay: false, source: TK },
  { date: "2026-01-02", kind: "PUBLIC_HOLIDAY", isWorkingDay: false, source: TK },
  { date: "2026-01-05", kind: "PUBLIC_HOLIDAY", isWorkingDay: false, source: TK },
  { date: "2026-01-06", kind: "PUBLIC_HOLIDAY", isWorkingDay: false, source: TK },
  { date: "2026-01-07", kind: "PUBLIC_HOLIDAY", isWorkingDay: false, source: TK },
  { date: "2026-01-08", kind: "PUBLIC_HOLIDAY", isWorkingDay: false, source: TK },
  { date: "2026-01-09", kind: "TRANSFERRED_DAY_OFF", isWorkingDay: false, source: P2026 },
  { date: "2026-02-23", kind: "PUBLIC_HOLIDAY", isWorkingDay: false, source: TK },
  {
    date: "2026-03-09",
    kind: "TRANSFERRED_DAY_OFF",
    isWorkingDay: false,
    source: `${TK} (8 марта — воскресенье)`,
  },
  { date: "2026-05-01", kind: "PUBLIC_HOLIDAY", isWorkingDay: false, source: TK },
  {
    date: "2026-05-11",
    kind: "TRANSFERRED_DAY_OFF",
    isWorkingDay: false,
    source: `${TK} (9 мая — суббота)`,
  },
  { date: "2026-06-12", kind: "PUBLIC_HOLIDAY", isWorkingDay: false, source: TK },
  { date: "2026-11-04", kind: "PUBLIC_HOLIDAY", isWorkingDay: false, source: TK },
  { date: "2026-12-31", kind: "TRANSFERRED_DAY_OFF", isWorkingDay: false, source: P2026 },
  // 2027
  { date: "2027-01-01", kind: "PUBLIC_HOLIDAY", isWorkingDay: false, source: TK },
  { date: "2027-01-04", kind: "PUBLIC_HOLIDAY", isWorkingDay: false, source: TK },
  { date: "2027-01-05", kind: "PUBLIC_HOLIDAY", isWorkingDay: false, source: TK },
  { date: "2027-01-06", kind: "PUBLIC_HOLIDAY", isWorkingDay: false, source: TK },
  { date: "2027-01-07", kind: "PUBLIC_HOLIDAY", isWorkingDay: false, source: TK },
  { date: "2027-01-08", kind: "PUBLIC_HOLIDAY", isWorkingDay: false, source: TK },
  { date: "2027-02-20", kind: "TRANSFERRED_WORKING_DAY", isWorkingDay: true, source: P2027 },
  { date: "2027-02-22", kind: "TRANSFERRED_DAY_OFF", isWorkingDay: false, source: P2027 },
  { date: "2027-02-23", kind: "PUBLIC_HOLIDAY", isWorkingDay: false, source: TK },
  { date: "2027-03-08", kind: "PUBLIC_HOLIDAY", isWorkingDay: false, source: TK },
  {
    date: "2027-05-03",
    kind: "TRANSFERRED_DAY_OFF",
    isWorkingDay: false,
    source: `${TK} (1 мая — суббота)`,
  },
  {
    date: "2027-05-10",
    kind: "TRANSFERRED_DAY_OFF",
    isWorkingDay: false,
    source: `${TK} (9 мая — воскресенье)`,
  },
  {
    date: "2027-06-14",
    kind: "TRANSFERRED_DAY_OFF",
    isWorkingDay: false,
    source: `${TK} (12 июня — суббота)`,
  },
  { date: "2027-11-04", kind: "PUBLIC_HOLIDAY", isWorkingDay: false, source: TK },
  { date: "2027-11-05", kind: "TRANSFERRED_DAY_OFF", isWorkingDay: false, source: P2027 },
  { date: "2027-12-31", kind: "TRANSFERRED_DAY_OFF", isWorkingDay: false, source: P2027 },
];
