import { describe, expect, it } from "vitest";

import { moscowDateTime } from "@/lib/moscow-date";
import { HOLIDAYS } from "@/server/dal/demo/holidays";

import { bellByPair } from "./bells";
import {
  type ScheduleChangeInput,
  type ScheduleEventInput,
  buildTodayView,
  buildWeekView,
  nextStudyDay,
} from "./schedule";
import { buildCalendar } from "./working-days";

const calendar = buildCalendar(HOLIDAYS);
const at = (date: string, time: string) => moscowDateTime(date, time);

function event(id: string, date: string, pair: number, extra: Partial<ScheduleEventInput> = {}) {
  const bell = bellByPair(pair);
  return {
    id,
    type: "SEMINAR",
    startsAt: at(date, bell.start),
    endsAt: at(date, bell.end),
    discipline: `Дисциплина ${id}`,
    teacher: "Преподаватель А",
    room: "214",
    platform: null,
    format: "OFFLINE",
    ...extra,
  } satisfies ScheduleEventInput;
}

function change(
  eventId: string,
  field: ScheduleChangeInput["field"],
  oldValue: string,
  newValue: string,
): ScheduleChangeInput {
  return {
    eventId,
    field,
    oldValue,
    newValue,
    reason: "Причина",
    createdAt: at("2026-11-20", "15:00"),
  };
}

describe("nextStudyDay", () => {
  it("рабочий день — он сам", () => {
    expect(nextStudyDay(at("2026-11-20", "12:00"), calendar)).toBe("2026-11-20");
  });
  it("суббота и воскресенье → понедельник", () => {
    expect(nextStudyDay(at("2026-11-21", "12:00"), calendar)).toBe("2026-11-23");
    expect(nextStudyDay(at("2026-11-22", "12:00"), calendar)).toBe("2026-11-23");
  });
  it("праздник 4 ноября → 5 ноября", () => {
    expect(nextStudyDay(at("2026-11-04", "09:00"), calendar)).toBe("2026-11-05");
  });
  it("рабочая суббота 20.02.2027 — учебный день", () => {
    expect(nextStudyDay(at("2027-02-20", "09:00"), calendar)).toBe("2027-02-20");
    // Воскресенье 21.02 → понедельник 22.02 выходной, 23.02 праздник → 24.02.
    expect(nextStudyDay(at("2027-02-21", "09:00"), calendar)).toBe("2027-02-24");
  });
  it("пятница вечером — всё ещё пятница; следующий учебный день после неё — понедельник", () => {
    expect(nextStudyDay(at("2026-11-20", "23:00"), calendar)).toBe("2026-11-20");
  });
});

describe("buildTodayView", () => {
  const monday = [event("m1", "2026-11-23", 1), event("m2", "2026-11-23", 2)];

  it("воскресенье 22.11.2026: «сегодня пар нет» и пары понедельника 23.11", () => {
    const view = buildTodayView(at("2026-11-22", "12:00"), monday, [], calendar);
    expect(view.noClassesToday).toBe(true);
    expect(view.date).toBe("2026-11-23");
    expect(view.items.map((i) => i.eventId)).toEqual(["m1", "m2"]);
    expect(view.items.every((i) => i.status === "upcoming")).toBe(true);
  });

  const day = "2026-11-23";
  const pairs = [1, 2, 3, 4].map((p) => event(`p${p}`, day, p));
  const statuses = (time: string) =>
    buildTodayView(at(day, time), pairs, [], calendar).items.map((i) => i.status);

  it("до первой пары: первая — следующая", () => {
    expect(statuses("08:00")).toEqual(["next", "upcoming", "upcoming", "upcoming"]);
  });
  it("во время второй пары: первая прошла, вторая идёт, третья следующая", () => {
    expect(statuses("11:00")).toEqual(["past", "now", "next", "upcoming"]);
  });
  it("большой перерыв 11:50–12:40: идущей пары нет, третья следующая", () => {
    expect(statuses("11:50")).toEqual(["past", "past", "next", "upcoming"]);
    expect(statuses("12:39")).toEqual(["past", "past", "next", "upcoming"]);
    expect(statuses("12:40")).toEqual(["past", "past", "now", "next"]);
  });
  it("после всех пар: все прошли, день тот же", () => {
    const view = buildTodayView(at(day, "20:00"), pairs, [], calendar);
    expect(view.noClassesToday).toBe(false);
    expect(view.items.map((i) => i.status)).toEqual(["past", "past", "past", "past"]);
  });

  it("отменённая пара не становится «следующей», изменённая показывает было → стало", () => {
    const changes = [
      change("p1", "CANCELLED", "false", "true"),
      { ...change("p2", "ROOM", "305", "412") },
    ];
    const view = buildTodayView(at(day, "08:00"), pairs, changes, calendar);
    const [p1, p2] = view.items;
    expect(p1?.status).toBe("cancelled");
    expect(p1?.cancelled).toBe(true);
    expect(p2?.status).toBe("next");
    expect(p2?.diffs).toEqual([{ field: "ROOM", from: "305", to: "412" }]);
  });
});

describe("buildWeekView", () => {
  it("перенос виден в обоих днях: «перенесена с» и «перенесена на»", () => {
    // Пара перенесена со вторника 24.11, 1 пара, на четверг 26.11, 3 пара.
    const moved = event("mv", "2026-11-26", 3);
    const changes = [
      change(
        "mv",
        "START_TIME",
        at("2026-11-24", bellByPair(1).start).toISOString(),
        at("2026-11-26", bellByPair(3).start).toISOString(),
      ),
    ];
    const week = buildWeekView("2026-11-23", [moved], changes, calendar);
    const tue = week.find((d) => d.date === "2026-11-24");
    const thu = week.find((d) => d.date === "2026-11-26");
    expect(tue?.items).toHaveLength(1);
    expect(tue?.items[0]?.kind).toBe("moved-away");
    expect(tue?.items[0]?.movedTo).toEqual({ date: "2026-11-26", pair: 3, start: "12:40" });
    expect(thu?.items[0]?.kind).toBe("event");
    expect(thu?.items[0]?.movedFrom).toEqual({ date: "2026-11-24", pair: 1, start: "09:00" });
  });

  it("неделя с понедельника, семь дней, выходные отмечены", () => {
    const week = buildWeekView("2026-11-23", [], [], calendar);
    expect(week.map((d) => d.date)).toEqual([
      "2026-11-23",
      "2026-11-24",
      "2026-11-25",
      "2026-11-26",
      "2026-11-27",
      "2026-11-28",
      "2026-11-29",
    ]);
    expect(week.map((d) => d.isWorkingDay)).toEqual([true, true, true, true, true, false, false]);
  });
});
