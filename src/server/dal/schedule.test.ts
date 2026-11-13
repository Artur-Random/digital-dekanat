// Тесты с настоящей базой: сид расписания, сервис изменения пары, уведомления.
// Сбрасывают демо-данные на фиксированную дату.

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { moscowTime, toDateKey } from "@/lib/moscow-date";
import type { StaffActor, StudentActor } from "@/server/auth/guards";
import { getDb, disconnectDb } from "@/server/db";
import { BELLS } from "@/server/rules/bells";
import { buildActionFeed } from "@/server/rules/action-feed";
import { buildTodayView } from "@/server/rules/schedule";
import { ScheduleDomainError } from "@/server/rules/schedule-change";
import { buildCalendar, subtractWorkingDays } from "@/server/rules/working-days";
import {
  notifyStudentAboutApplication,
  publishAnnouncement,
  publishRetakeSchedule,
} from "@/server/services/notifications";
import { createScheduleChange } from "@/server/services/schedule";

import { getActionFeedContext } from "./action-feed";
import { HOLIDAYS } from "./demo/holidays";
import { resetDemoData } from "./demo/reset";
import { listScheduleForStudent } from "./schedule";

// Воскресенье: жюри открывает сайт 22.11.2026.
const TODAY = "2026-11-22";
const calendar = buildCalendar(HOLIDAYS);

async function studentActor(login: "alina" | "denis"): Promise<StudentActor> {
  const s = await getDb().studentProfile.findFirstOrThrow({
    where: { user: { login } },
    select: { id: true, userId: true, funding: true, level: { select: { code: true } } },
  });
  return { userId: s.userId, studentId: s.id, levelCode: s.level.code, funding: s.funding };
}

async function staffActor(login: "mfc" | "dekanat"): Promise<StaffActor> {
  const s = await getDb().staffProfile.findFirstOrThrow({
    where: { user: { login } },
    select: { id: true, userId: true, unitId: true },
  });
  return { userId: s.userId, staffId: s.id, unitId: s.unitId };
}

beforeAll(async () => {
  await resetDemoData({ today: TODAY });
});

afterAll(async () => {
  await resetDemoData();
  await disconnectDb();
});

describe("сид расписания", () => {
  it("все события стоят ровно на сетке звонков МГПУ и только в рабочие дни", async () => {
    const events = await getDb().scheduleEvent.findMany({
      select: { startsAt: true, endsAt: true },
    });
    expect(events.length).toBeGreaterThan(100);
    for (const e of events) {
      const bell = BELLS.find((b) => b.start === moscowTime(e.startsAt));
      expect(bell, e.startsAt.toISOString()).toBeDefined();
      expect(moscowTime(e.endsAt)).toBe(bell?.end);
      const day = toDateKey(e.startsAt);
      expect(calendar.nonWorking.has(day), day).toBe(false);
    }
  });

  it("пары ПС-251 в пределах 1–5, МП-261 в пределах 6–8", async () => {
    const rows = await getDb().scheduleEvent.findMany({
      where: { groupId: { not: null } },
      select: { startsAt: true, group: { select: { code: true } } },
    });
    for (const r of rows) {
      const pair = BELLS.find((b) => b.start === moscowTime(r.startsAt))?.pair ?? 0;
      if (r.group?.code === "ПС-251") expect(pair).toBeLessThanOrEqual(5);
      else expect(pair).toBeGreaterThanOrEqual(6);
    }
  });

  it("N-14: уведомление о расписании пересдач не позже чем за 3 рабочих дня до пересдачи", async () => {
    const retake = await getDb().scheduleEvent.findFirstOrThrow({
      where: { type: "RETAKE_1" },
      select: { startsAt: true },
    });
    const notice = await getDb().notification.findFirstOrThrow({
      where: { type: "RETAKE" },
      select: { createdAt: true, title: true },
    });
    expect(notice.title).toBe("Опубликовано расписание пересдач");
    const latest = subtractWorkingDays(toDateKey(retake.startsAt), 3, calendar);
    expect(toDateKey(notice.createdAt) <= latest).toBe(true);
    expect(notice.createdAt.getTime()).toBeLessThan(new Date(`${TODAY}T04:00:00+03:00`).getTime());
  });

  it("у Алины 5–7 уведомлений, у Дениса 2–3; часть непрочитанные", async () => {
    for (const [login, min, max] of [
      ["alina", 5, 7],
      ["denis", 2, 3],
    ] as const) {
      const all = await getDb().notification.count({ where: { recipient: { login } } });
      const unread = await getDb().notification.count({
        where: { recipient: { login }, isRead: false },
      });
      expect(all, login).toBeGreaterThanOrEqual(min);
      expect(all, login).toBeLessThanOrEqual(max);
      expect(unread, login).toBeGreaterThan(0);
      expect(unread, login).toBeLessThan(all);
    }
  });
});

describe("что увидит жюри в воскресенье 22.11.2026 в 12:00", () => {
  const now = new Date("2026-11-22T12:00:00+03:00");

  it("alina: «сегодня пар нет», пары понедельника 23.11 со сменой аудитории; в ленте пересдача и справка", async () => {
    const actor = await studentActor("alina");
    const s = await listScheduleForStudent(
      actor,
      new Date("2026-11-21T00:00:00Z"),
      new Date("2026-12-14T00:00:00Z"),
    );
    const view = buildTodayView(now, s.events, s.changes, s.calendar);
    expect(view.noClassesToday).toBe(true);
    expect(view.date).toBe("2026-11-23");
    expect(view.items.some((i) => i.diffs.some((d) => d.field === "ROOM"))).toBe(true);

    const ctx = await getActionFeedContext(actor, now);
    if (!ctx) throw new Error("нет контекста");
    const kinds = buildActionFeed(now, ctx).map((i) => i.kind);
    expect(kinds).toContain("retake");
    expect(kinds).toContain("application-ready");
    expect(kinds).toContain("schedule-change");
    expect(kinds).not.toContain("scholarship-window");
  });

  it("denis: вечерние пары понедельника с заменой преподавателя, без пересдачи и стипендии", async () => {
    const actor = await studentActor("denis");
    const s = await listScheduleForStudent(
      actor,
      new Date("2026-11-21T00:00:00Z"),
      new Date("2026-12-14T00:00:00Z"),
    );
    const view = buildTodayView(now, s.events, s.changes, s.calendar);
    expect(view.date).toBe("2026-11-23");
    expect(view.items.every((i) => (i.pair ?? 0) >= 6)).toBe(true);
    expect(view.items.some((i) => i.diffs.some((d) => d.field === "TEACHER"))).toBe(true);
    const ctx = await getActionFeedContext(actor, now);
    if (!ctx) throw new Error("нет контекста");
    const kinds = buildActionFeed(now, ctx).map((i) => i.kind);
    expect(kinds).not.toContain("retake");
    expect(kinds).not.toContain("scholarship-window");
  });
});

describe("createScheduleChange", () => {
  it("N-15: перенос пересдачи — ошибка домена, база не меняется", async () => {
    const dekanat = await staffActor("dekanat");
    const retake = await getDb().scheduleEvent.findFirstOrThrow({
      where: { type: "RETAKE_1" },
      select: { id: true, startsAt: true },
    });
    const before = await getDb().scheduleChange.count();
    await expect(
      createScheduleChange(dekanat, retake.id, { pair: 7 }, "Попытка переноса"),
    ).rejects.toBeInstanceOf(ScheduleDomainError);
    expect(await getDb().scheduleChange.count()).toBe(before);
    const after = await getDb().scheduleEvent.findUniqueOrThrow({ where: { id: retake.id } });
    expect(after.startsAt.getTime()).toBe(retake.startsAt.getTime());
  });

  it("уведомления получают только студенты затронутой группы", async () => {
    const dekanat = await staffActor("dekanat");
    const event = await getDb().scheduleEvent.findFirstOrThrow({
      where: { group: { code: "МП-261" }, startsAt: { gt: new Date("2026-11-24T00:00:00Z") } },
      orderBy: { startsAt: "asc" },
      select: { id: true },
    });
    const count = (login: string) =>
      getDb().notification.count({ where: { recipient: { login } } });
    const [alinaBefore, denisBefore] = [await count("alina"), await count("denis")];
    const result = await createScheduleChange(
      dekanat,
      event.id,
      { cancel: true },
      "Проверка теста",
    );
    expect(result.notified).toBe(1);
    expect(await count("alina")).toBe(alinaBefore);
    expect(await count("denis")).toBe(denisBefore + 1);
  });

  it("сотрудник МФЦ не меняет расписание: ответ как на несуществующую пару", async () => {
    const mfc = await staffActor("mfc");
    const event = await getDb().scheduleEvent.findFirstOrThrow({
      where: { group: { code: "ПС-251" } },
      select: { id: true },
    });
    await expect(
      createScheduleChange(mfc, event.id, { cancel: true }, "Чужое подразделение"),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("уведомления: только своё подразделение", () => {
  it("МФЦ не публикует объявления и расписание пересдач; деканат не уведомляет о справке МФЦ", async () => {
    const mfc = await staffActor("mfc");
    const dekanat = await staffActor("dekanat");
    const before = await getDb().notification.count();
    await expect(
      publishAnnouncement(mfc, { groupCodes: ["ПС-251"], title: "Тест", body: "Тест объявления" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const retake = await getDb().scheduleEvent.findFirstOrThrow({
      where: { type: "RETAKE_1" },
      select: { id: true },
    });
    await expect(publishRetakeSchedule(mfc, retake.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    const cert = await getDb().application.findFirstOrThrow({
      where: { unit: { code: "MFC" } },
      select: { id: true },
    });
    await expect(notifyStudentAboutApplication(dekanat, cert.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(await getDb().notification.count()).toBe(before);
  });
});

describe("сброс демо в особые дни календаря", () => {
  // Рабочая суббота 20.02.2027 без пар, праздники и выходные вокруг неё: сброс не должен падать.
  for (const today of ["2027-02-19", "2027-02-20", "2027-02-21", "2026-11-03", "2026-12-30"]) {
    it(`сброс на ${today} проходит, у Алины есть изменения и пересдача в будний день`, async () => {
      await resetDemoData({ today });
      expect(await getDb().scheduleChange.count()).toBe(5);
      const retake = await getDb().scheduleEvent.findFirstOrThrow({
        where: { type: "RETAKE_1" },
        select: { startsAt: true },
      });
      const dow = new Date(`${toDateKey(retake.startsAt)}T12:00:00Z`).getUTCDay();
      expect(dow).toBeGreaterThanOrEqual(1);
      expect(dow).toBeLessThanOrEqual(5);
    });
  }
});
