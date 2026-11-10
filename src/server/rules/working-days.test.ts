import { describe, expect, it } from "vitest";

import { weekday } from "@/lib/moscow-date";
import { HOLIDAYS } from "@/server/dal/demo/holidays";

import { addWorkingDays, buildCalendar, isWorkingDay, subtractWorkingDays } from "./working-days";

const calendar = buildCalendar(HOLIDAYS);

describe("рабочие дни", () => {
  it("суббота, воскресенье и праздник нерабочие", () => {
    expect(isWorkingDay("2026-11-07", calendar)).toBe(false);
    expect(isWorkingDay("2026-11-08", calendar)).toBe(false);
    expect(isWorkingDay("2026-11-04", calendar)).toBe(false);
    expect(isWorkingDay("2026-11-05", calendar)).toBe(true);
  });

  it("3 рабочих дня ПОСЛЕ даты: пятница → среда", () => {
    expect(addWorkingDays("2026-11-13", 3, calendar)).toBe("2026-11-18");
  });

  it("пропускает праздник 4 ноября", () => {
    expect(addWorkingDays("2026-11-02", 3, calendar)).toBe("2026-11-06");
  });

  it("пропускает новогодние каникулы", () => {
    expect(addWorkingDays("2026-12-30", 1, calendar)).toBe("2027-01-11");
  });

  it("вычитание обратно сложению", () => {
    expect(subtractWorkingDays("2026-11-06", 3, calendar)).toBe("2026-11-02");
  });

  it("отрицательное и дробное число дней — ошибка", () => {
    expect(() => addWorkingDays("2026-11-02", -1, calendar)).toThrow();
    expect(() => addWorkingDays("2026-11-02", 1.5, calendar)).toThrow();
  });
});

describe("рабочая суббота", () => {
  it("20.02.2027 рабочая по постановлению № 1187, 22.02.2027 выходной", () => {
    expect(isWorkingDay("2027-02-20", calendar)).toBe(true);
    expect(isWorkingDay("2027-02-21", calendar)).toBe(false);
    expect(isWorkingDay("2027-02-22", calendar)).toBe(false);
    // Пятница 19.02 + 1 рабочий день = суббота 20.02.
    expect(addWorkingDays("2027-02-19", 1, calendar)).toBe("2027-02-20");
    expect(addWorkingDays("2027-02-19", 2, calendar)).toBe("2027-02-24");
  });
});

describe("календарь в сиде", () => {
  it("даты уникальны; нерабочие выпадают на будни, рабочие на выходные", () => {
    expect(new Set(HOLIDAYS.map((h) => h.date)).size).toBe(HOLIDAYS.length);
    for (const h of HOLIDAYS) {
      const weekend = [0, 6].includes(weekday(h.date));
      expect(weekend, h.date).toBe(h.isWorkingDay);
      expect(h.kind === "TRANSFERRED_WORKING_DAY", h.date).toBe(h.isWorkingDay);
    }
  });
});
