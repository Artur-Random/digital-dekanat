import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { type DateKey, addDays, mondayOf, moscowDateTime, weekday } from "@/lib/moscow-date";
import type { StaffActor } from "@/server/auth/guards";
import { bellByPair } from "@/server/rules/bells";
import { studyDayAfter } from "@/server/rules/schedule";
import { addWorkingDays, isWorkingDay, subtractWorkingDays } from "@/server/rules/working-days";
import { createScheduleChange } from "@/server/services/schedule";
import {
  notifyStudentAboutApplication,
  publishAnnouncement,
  publishRetakeSchedule,
} from "@/server/services/notifications";

import type { SeedContext } from "./reset";
import { seedStudy } from "./study";
import { ALINA_DEBT_DISCIPLINE } from "./study-data";
import {
  ANNOUNCEMENTS,
  CHANGE_REASONS,
  DISCIPLINES,
  type DisciplineKey,
  MP261,
  PS251,
  ROOMS,
  SCHEDULE_WEEKS_AHEAD,
  SCHEDULE_WEEKS_BACK,
  TEACHERS,
  type WeekTemplate,
} from "./schedule-data";

type Tx = Prisma.TransactionClient;

type Refs = {
  teachers: Map<string, string>;
  rooms: Map<string, string>;
  disciplines: Map<DisciplineKey, string>;
};

/** Ключ события группы: группа, дата, пара. */
type EventKey = `${string}|${DateKey}|${number}`;

function requireId<K>(map: Map<K, string>, key: K, what: string): string {
  const id = map.get(key);
  if (!id) throw new Error(`Нет ${what}: ${String(key)}`);
  return id;
}

function staffActor(ctx: SeedContext, unit: "MFC" | "DEKANAT"): StaffActor {
  const actor = ctx.staffActors.get(unit);
  if (!actor) throw new Error(`Нет сотрудника ${unit}`);
  return actor;
}

async function seedReferences(tx: Tx): Promise<Refs> {
  const teachers = await tx.teacher.createManyAndReturn({
    data: TEACHERS.map((fullName) => ({ fullName })),
  });
  const rooms = await tx.room.createManyAndReturn({ data: ROOMS.map((name) => ({ name })) });
  const disciplines = new Map<DisciplineKey, string>();
  for (const [key, name] of Object.entries(DISCIPLINES) as [DisciplineKey, string][]) {
    const row = await tx.discipline.create({ data: { name } });
    disciplines.set(key, row.id);
  }
  return {
    teachers: new Map(teachers.map((t) => [t.fullName, t.id])),
    rooms: new Map(rooms.map((r) => [r.name, r.id])),
    disciplines,
  };
}

/** Регулярные пары группы на 4 недели назад и 4 вперёд, только в рабочие будни. */
async function seedGroupTimetable(
  tx: Tx,
  ctx: SeedContext,
  refs: Refs,
  groupCode: string,
  template: WeekTemplate,
  index: Map<EventKey, string>,
): Promise<void> {
  const groupId = requireId(ctx.ids.groups, groupCode, "группы");
  const first = addDays(mondayOf(ctx.today), -7 * SCHEDULE_WEEKS_BACK);
  const last = addDays(mondayOf(ctx.today), 7 * SCHEDULE_WEEKS_AHEAD + 6);
  const rows: Prisma.ScheduleEventCreateManyInput[] = [];
  const keys: EventKey[] = [];
  for (let day = first; day <= last; day = addDays(day, 1)) {
    const dow = weekday(day);
    if (dow < 1 || dow > 5 || !isWorkingDay(day, ctx.calendar)) continue;
    for (const slot of template[dow as 1 | 2 | 3 | 4 | 5]) {
      const bell = bellByPair(slot.pair);
      rows.push({
        groupId,
        disciplineId: requireId(refs.disciplines, slot.discipline, "дисциплины"),
        teacherId: requireId(refs.teachers, slot.teacher, "преподавателя"),
        roomId: requireId(refs.rooms, slot.room, "аудитории"),
        type: slot.type,
        startsAt: moscowDateTime(day, bell.start),
        endsAt: moscowDateTime(day, bell.end),
      });
      keys.push(`${groupCode}|${day}|${slot.pair}`);
    }
  }
  const created = await tx.scheduleEvent.createManyAndReturn({ data: rows, select: { id: true } });
  created.forEach((row, i) => {
    const key = keys[i];
    if (key) index.set(key, row.id);
  });
}

function eventsOn(index: Map<EventKey, string>, group: string, day: DateKey): [number, string][] {
  const result: [number, string][] = [];
  for (const [key, id] of index) {
    const [g, d, pair] = key.split("|");
    if (g === group && d === day) result.push([Number(pair), id]);
  }
  return result.sort((a, b) => a[0] - b[0]);
}

/**
 * Расписание, изменения, долг Алины и уведомления. Изменения и уведомления создаются теми же
 * сервисами, что и в работающем приложении (createScheduleChange, publish*).
 */
export async function seedSchedule(tx: Tx, ctx: SeedContext): Promise<void> {
  const refs = await seedReferences(tx);
  const index = new Map<EventKey, string>();
  await seedGroupTimetable(tx, ctx, refs, "ПС-251", PS251, index);
  await seedGroupTimetable(tx, ctx, refs, "МП-261", MP261, index);
  // Оценки, задолженность и события сессии (задание 5): до пересдачи, которая на неё опирается.
  await seedStudy(tx, ctx, refs);

  const dekanat = staffActor(ctx, "DEKANAT");
  const mfc = staffActor(ctx, "MFC");
  const today = ctx.today;
  const yesterday = subtractWorkingDays(today, 1, ctx.calendar);
  const at = (day: DateKey, time: string) => moscowDateTime(day, time);
  const options = (now: Date) => ({ tx, now });

  // Ближайший учебный день: сегодня, если сегодня рабочий, иначе следующий. Берём дни, в которые
  // у группы есть пары: в рабочую субботу (20.02.2027) пар нет. Так демонстрация работает
  // и в воскресенье 22.11.
  const firstDayWithPairs = (group: string, from: DateKey) => {
    let day = from;
    for (let i = 0; i < 30 && eventsOn(index, group, day).length === 0; i++) {
      day = studyDayAfter(day, ctx.calendar);
    }
    return day;
  };
  const start = isWorkingDay(today, ctx.calendar) ? today : studyDayAfter(today, ctx.calendar);
  const d0 = firstDayWithPairs("ПС-251", start);
  const d1 = firstDayWithPairs("ПС-251", studyDayAfter(d0, ctx.calendar));

  // Объявление для обеих групп — самое раннее уведомление.
  const announcementDay = subtractWorkingDays(today, 2, ctx.calendar);
  for (const [i, a] of ANNOUNCEMENTS.entries()) {
    await publishAnnouncement(
      dekanat,
      { groupCodes: [...a.groupCodes], title: a.title, body: a.body },
      options(at(announcementDay, i === 0 ? "11:00" : "12:30")),
    );
  }

  // ПС-251: смена аудитории у пары ближайшего учебного дня.
  const psD0 = eventsOn(index, "ПС-251", d0);
  const roomEvent = psD0.find(([pair]) => pair === 2) ?? psD0[0];
  if (!roomEvent) throw new Error(`Нет пар ПС-251 на ${d0}`);
  await createScheduleChange(
    dekanat,
    roomEvent[1],
    { roomId: requireId(refs.rooms, "412", "аудитории") },
    CHANGE_REASONS.room,
    options(at(yesterday, "15:10")),
  );

  // ПС-251: отмена пары на следующий учебный день.
  const psD1 = eventsOn(index, "ПС-251", d1);
  const cancelEvent = psD1.at(-1);
  if (!cancelEvent) throw new Error(`Нет пар ПС-251 на ${d1}`);
  await createScheduleChange(
    dekanat,
    cancelEvent[1],
    { cancel: true },
    CHANGE_REASONS.cancel,
    options(at(yesterday, "15:20")),
  );

  // ПС-251: перенос пары внутри недели на другой день и другую пару, и замена преподавателя.
  // Берём учебные дни недели ближайшего учебного дня, кроме d0 и d1; если их меньше двух —
  // следующую неделю.
  const weekDays = (monday: DateKey) =>
    Array.from({ length: 5 }, (_, i) => addDays(monday, i)).filter(
      (d) => d !== d0 && d !== d1 && eventsOn(index, "ПС-251", d).length > 0,
    );
  let candidates = weekDays(mondayOf(d0));
  if (candidates.length < 2) candidates = weekDays(addDays(mondayOf(d0), 7));
  const from = candidates[0];
  const to = candidates.at(-1);
  if (!from || !to || from === to) throw new Error("Нет дней для переноса пары");
  const moveEvent = eventsOn(index, "ПС-251", from)[0];
  const busy = new Set(eventsOn(index, "ПС-251", to).map(([pair]) => pair));
  const freePair = [1, 2, 3, 4, 5].find((p) => !busy.has(p));
  if (!moveEvent || freePair === undefined) throw new Error("Нет пары для переноса");
  await createScheduleChange(
    dekanat,
    moveEvent[1],
    { date: to, pair: freePair },
    CHANGE_REASONS.move,
    options(at(yesterday, "15:30")),
  );

  const teacherDay = candidates.length > 2 ? candidates[1] : to;
  const teacherEvent = teacherDay
    ? eventsOn(index, "ПС-251", teacherDay).find(([, id]) => id !== moveEvent[1])
    : undefined;
  if (!teacherEvent) throw new Error("Нет пары для замены преподавателя");
  await createScheduleChange(
    dekanat,
    teacherEvent[1],
    { teacherId: requireId(refs.teachers, "Полякова Елена Аркадьевна", "преподавателя") },
    CHANGE_REASONS.teacher,
    options(at(yesterday, "15:40")),
  );

  // МП-261: замена преподавателя в ближайший учебный день.
  const mpDay = firstDayWithPairs("МП-261", start);
  const mpEvent = eventsOn(index, "МП-261", mpDay)[0];
  if (!mpEvent) throw new Error(`Нет пар МП-261 на ${mpDay}`);
  await createScheduleChange(
    dekanat,
    mpEvent[1],
    { teacherId: requireId(refs.teachers, "Гладков Пётр Андреевич", "преподавателя") },
    CHANGE_REASONS.teacher,
    options(at(yesterday, "16:00")),
  );

  await seedAlinaRetake(tx, ctx, refs, dekanat, yesterday);

  // «Справка готова» — в момент перехода заявки Алины в статус READY.
  const ready = await tx.application.findFirst({
    where: { status: "READY", studentId: requireId(ctx.ids.students, "alina", "студента") },
    select: { id: true },
  });
  if (ready) {
    const readyEvent = await tx.applicationEvent.findFirst({
      where: { applicationId: ready.id, toStatus: "READY" },
      select: { createdAt: true },
    });
    await notifyStudentAboutApplication(
      mfc,
      ready.id,
      options(readyEvent?.createdAt ?? at(yesterday, "14:30")),
    );
  }

  // Объявления уже прочитаны; изменения, пересдача и справка — нет.
  await tx.notification.updateMany({ where: { type: "ANNOUNCEMENT" }, data: { isRead: true } });
}

/** Пересдача Алины (этап I) по задолженности из seedStudy и уведомление о расписании пересдач. */
async function seedAlinaRetake(
  tx: Tx,
  ctx: SeedContext,
  refs: Refs,
  dekanat: StaffActor,
  publishedDay: DateKey,
): Promise<void> {
  const studentId = requireId(ctx.ids.students, "alina", "студента");
  const disciplineId = requireId(refs.disciplines, ALINA_DEBT_DISCIPLINE, "дисциплины");
  // Пересдача (этап I) через 7 рабочих дней (в пределах 5–9), 6 пара: после пар группы.
  // Пересдача — в будний рабочий день: рабочую субботу пропускаем.
  let retakeDay = addWorkingDays(ctx.today, 7, ctx.calendar);
  while (weekday(retakeDay) === 6 || weekday(retakeDay) === 0) {
    retakeDay = addWorkingDays(retakeDay, 1, ctx.calendar);
  }
  const bell = bellByPair(6);
  const retake = await tx.scheduleEvent.create({
    data: {
      studentId,
      disciplineId,
      teacherId: requireId(refs.teachers, "Рябинин Сергей Михайлович", "преподавателя"),
      roomId: requireId(refs.rooms, "226", "аудитории"),
      type: "RETAKE_1",
      startsAt: moscowDateTime(retakeDay, bell.start),
      endsAt: moscowDateTime(retakeDay, bell.end),
    },
    select: { id: true },
  });
  // N-14: расписание доводится не позднее 3 рабочих дней до даты пересдачи. Публикуем в прошлом
  // рабочем дне: это за 8 рабочих дней до пересдачи.
  await publishRetakeSchedule(dekanat, retake.id, {
    tx,
    now: moscowDateTime(publishedDay, "11:30"),
  });
}
