import { describe, expect, it } from "vitest";

import { moscowDateTime } from "@/lib/moscow-date";

import { addCalendarYear, debtTimeline } from "./debts";

const now = moscowDateTime("2026-11-22", "12:00");
const retake = {
  id: "r1",
  startsAt: moscowDateTime("2026-12-01", "17:10"),
  type: "RETAKE_1" as const,
};

describe("debtTimeline", () => {
  it("крайний срок — через календарный год от даты образования (N-10)", () => {
    const t = debtTimeline({ formedAt: "2026-06-15", stage: "STAGE_1" }, 0, now, [retake]);
    expect(t.deadline).toBe("2027-06-15");
    expect(addCalendarYear("2028-02-29")).toBe("2029-02-28");
    expect(t.overdue).toBe(false);
  });

  it("этап I: попытка 1 из 2, ближайшая пересдача из расписания, дальше этап II (N-09, N-17)", () => {
    const t = debtTimeline({ formedAt: "2026-06-15", stage: "STAGE_1" }, 0, now, [retake]);
    expect(t).toMatchObject({
      stage: "STAGE_1",
      nextAttempt: 1,
      attemptsLeft: 2,
      nextStep: "STAGE_2",
    });
    expect(t.nextRetake?.id).toBe("r1");
  });

  it("после неудачной первой пересдачи — этап II, попытка 2 из 2, дальше отчисление", () => {
    const t = debtTimeline({ formedAt: "2026-06-15", stage: "STAGE_1" }, 1, now, []);
    expect(t).toMatchObject({
      stage: "STAGE_2",
      nextAttempt: 2,
      attemptsLeft: 1,
      nextStep: "EXPULSION",
    });
    expect(t.nextRetake).toBeNull();
  });

  it("две попытки использованы — попыток не осталось; прошедшая пересдача не «ближайшая»", () => {
    const later = moscowDateTime("2026-12-05", "12:00");
    const t = debtTimeline({ formedAt: "2026-06-15", stage: "STAGE_2" }, 2, later, [retake]);
    expect(t.nextAttempt).toBeNull();
    expect(t.attemptsLeft).toBe(0);
    expect(t.nextRetake).toBeNull();
  });

  it("срок прошёл — overdue", () => {
    const t = debtTimeline({ formedAt: "2025-06-15", stage: "STAGE_1" }, 0, now, []);
    expect(t.overdue).toBe(true);
  });
});
