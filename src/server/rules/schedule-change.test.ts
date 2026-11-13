import { describe, expect, it } from "vitest";

import { moscowDateTime } from "@/lib/moscow-date";
import { HOLIDAYS } from "@/server/dal/demo/holidays";

import { ScheduleDomainError, planScheduleChange } from "./schedule-change";
import type { ScheduleEventInput } from "./schedule";
import { buildCalendar } from "./working-days";

const calendar = buildCalendar(HOLIDAYS);

const base: ScheduleEventInput & { cancelled: boolean } = {
  id: "e1",
  type: "RETAKE_1",
  startsAt: moscowDateTime("2026-11-24", "17:10"),
  endsAt: moscowDateTime("2026-11-24", "18:30"),
  discipline: "Анатомия",
  teacher: "Преподаватель А",
  room: "226",
  platform: null,
  format: "OFFLINE",
  cancelled: false,
};

function codeOf(fn: () => unknown): string | null {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof ScheduleDomainError ? e.code : "other";
  }
}

describe("изменение пересдачи (N-15)", () => {
  it("дату, пару и отмену пересдачи менять нельзя — ошибка домена", () => {
    expect(codeOf(() => planScheduleChange(base, { date: "2026-11-25" }, calendar))).toBe(
      "RETAKE_LOCKED",
    );
    expect(codeOf(() => planScheduleChange(base, { pair: 7 }, calendar))).toBe("RETAKE_LOCKED");
    expect(codeOf(() => planScheduleChange(base, { cancel: true }, calendar))).toBe(
      "RETAKE_LOCKED",
    );
    expect(
      codeOf(() =>
        planScheduleChange(
          base,
          { pair: 7, teacher: { id: "t2", name: "Преподаватель Б" } },
          calendar,
        ),
      ),
    ).toBe("RETAKE_LOCKED");
  });

  it("преподавателя и формат пересдачи менять можно", () => {
    const plan = planScheduleChange(
      base,
      { teacher: { id: "t2", name: "Преподаватель Б" }, format: "ONLINE" },
      calendar,
    );
    expect(plan.fields.map((f) => f.field)).toEqual(["TEACHER", "FORMAT"]);
    expect(plan.update).toEqual({ teacherId: "t2", format: "ONLINE" });
  });
});

describe("перенос обычной пары", () => {
  const seminar = { ...base, type: "SEMINAR" as const };

  it("перенос на другой день и пару попадает на сетку звонков", () => {
    const plan = planScheduleChange(seminar, { date: "2026-11-26", pair: 3 }, calendar);
    expect(plan.update.startsAt?.toISOString()).toBe(
      moscowDateTime("2026-11-26", "12:40").toISOString(),
    );
    expect(plan.update.endsAt?.toISOString()).toBe(
      moscowDateTime("2026-11-26", "14:00").toISOString(),
    );
  });

  it("на выходной перенести нельзя; пустое изменение — ошибка", () => {
    expect(codeOf(() => planScheduleChange(seminar, { date: "2026-11-28" }, calendar))).toBe(
      "NOT_STUDY_DAY",
    );
    expect(codeOf(() => planScheduleChange(seminar, {}, calendar))).toBe("NOTHING_TO_CHANGE");
  });

  it("отменённую пару изменить нельзя", () => {
    expect(
      codeOf(() => planScheduleChange({ ...seminar, cancelled: true }, { pair: 2 }, calendar)),
    ).toBe("ALREADY_CANCELLED");
  });
});
