import { describe, expect, it } from "vitest";

import { weekday } from "@/lib/moscow-date";
import { HOLIDAYS } from "@/server/dal/demo/holidays";

import { addWorkingDays, isWorkingDay, subtractWorkingDays } from "./working-days";

const holidays = new Set(HOLIDAYS.map((h) => h.date));

describe("рабочие дни", () => {
  it("суббота, воскресенье и праздник нерабочие", () => {
    expect(isWorkingDay("2026-11-07", holidays)).toBe(false);
    expect(isWorkingDay("2026-11-08", holidays)).toBe(false);
    expect(isWorkingDay("2026-11-04", holidays)).toBe(false);
    expect(isWorkingDay("2026-11-05", holidays)).toBe(true);
  });

  it("3 рабочих дня ПОСЛЕ даты: пятница → среда", () => {
    expect(addWorkingDays("2026-11-13", 3, holidays)).toBe("2026-11-18");
  });

  it("пропускает праздник 4 ноября", () => {
    expect(addWorkingDays("2026-11-02", 3, holidays)).toBe("2026-11-06");
  });

  it("пропускает новогодние каникулы", () => {
    expect(addWorkingDays("2026-12-30", 1, holidays)).toBe("2027-01-11");
  });

  it("вычитание обратно сложению", () => {
    expect(subtractWorkingDays("2026-11-06", 3, holidays)).toBe("2026-11-02");
  });

  it("отрицательное и дробное число дней — ошибка", () => {
    expect(() => addWorkingDays("2026-11-02", -1, holidays)).toThrow();
    expect(() => addWorkingDays("2026-11-02", 1.5, holidays)).toThrow();
  });
});

describe("календарь в сиде", () => {
  it("все даты уникальны и выпадают на будни", () => {
    expect(holidays.size).toBe(HOLIDAYS.length);
    for (const h of HOLIDAYS) {
      const day = weekday(h.date);
      expect(day, h.date).not.toBe(0);
      expect(day, h.date).not.toBe(6);
    }
  });
});
