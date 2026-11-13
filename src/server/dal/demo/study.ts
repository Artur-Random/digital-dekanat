import "server-only";

import type { ControlForm, EducationLevelCode, Prisma } from "@/generated/prisma/client";
import {
  type DateKey,
  addDays,
  dateOnly,
  mondayOf,
  moscowDateTime,
  weekday,
} from "@/lib/moscow-date";
import { bellByPair } from "@/server/rules/bells";
import { addCalendarYear } from "@/server/rules/debts";
import { type GradeBandInput, gradeFor } from "@/server/rules/grades";
import { isWorkingDay } from "@/server/rules/working-days";

import type { SeedContext } from "./reset";
import { type DisciplineKey, MP261, PS251, type WeekTemplate } from "./schedule-data";
import {
  ALINA_DEBT_DISCIPLINE,
  ALINA_SEMESTER_1,
  ALINA_SEMESTER_2,
  ALINA_SEMESTER_3,
  DENIS_SEMESTER_1,
  type PastResult,
  type SessionControl,
  type YearDate,
} from "./study-data";

type Tx = Prisma.TransactionClient;

export type StudyRefs = {
  teachers: Map<string, string>;
  rooms: Map<string, string>;
  disciplines: Map<DisciplineKey, string>;
};

function need<K>(map: Map<K, string>, key: K, what: string): string {
  const id = map.get(key);
  if (!id) throw new Error(`Нет ${what}: ${String(key)}`);
  return id;
}

/** Начало учебного года «сегодня»: с июля считаем новый учебный год. */
export function academicYearStart(today: DateKey): number {
  const year = Number(today.slice(0, 4));
  return Number(today.slice(5, 7)) >= 7 ? year : year - 1;
}

function isStudyWeekday(day: DateKey, ctx: SeedContext): boolean {
  const dow = weekday(day);
  return dow >= 1 && dow <= 5 && isWorkingDay(day, ctx.calendar);
}

/** Ближайший учебный будний день, начиная с day. */
function onOrAfterStudyDay(day: DateKey, ctx: SeedContext): DateKey {
  let d = day;
  while (!isStudyWeekday(d, ctx)) d = addDays(d, 1);
  return d;
}

function resolve(date: YearDate, ctx: SeedContext): DateKey {
  return onOrAfterStudyDay(`${academicYearStart(ctx.today) + date.yearOffset}-${date.md}`, ctx);
}

/** Понедельник последней учебной недели декабря текущего учебного года. */
function lastDecemberWeek(ctx: SeedContext): DateKey {
  let day = `${academicYearStart(ctx.today)}-12-31`;
  while (!isStudyWeekday(day, ctx)) day = addDays(day, -1);
  return mondayOf(day);
}

function controlDay(control: SessionControl, ctx: SeedContext): DateKey {
  if ("december" in control.when) {
    return onOrAfterStudyDay(addDays(lastDecemberWeek(ctx), control.when.december), ctx);
  }
  return resolve(control.when.january, ctx);
}

/** Преподаватель и аудитория дисциплины из недельного шаблона группы. */
function slotOf(template: WeekTemplate, discipline: DisciplineKey) {
  for (const day of Object.values(template)) {
    const slot = day.find((s) => s.discipline === discipline);
    if (slot) return slot;
  }
  throw new Error(`Нет дисциплины ${discipline} в шаблоне`);
}

async function loadBands(tx: Tx, ctx: SeedContext): Promise<GradeBandInput[]> {
  const codeById = new Map([...ctx.ids.levels].map(([code, id]) => [id, code]));
  const rows = await tx.gradeBand.findMany({
    select: {
      levelId: true,
      controlForm: true,
      minScore: true,
      maxScore: true,
      grade: true,
      isPositive: true,
    },
  });
  return rows.map((r) => ({
    ...r,
    levelCode: need(codeById, r.levelId, "уровня") as EducationLevelCode,
  }));
}

/**
 * Оценки по семестрам, задолженность Алины и события сессии текущего семестра.
 * Запросы внутри транзакции идут по одному (см. loadEventInTx).
 */
export async function seedStudy(
  tx: Tx,
  ctx: SeedContext,
  refs: StudyRefs,
): Promise<{ debtDisciplineId: string }> {
  const bands = await loadBands(tx, ctx);
  const alina = need(ctx.ids.students, "alina", "студента");
  const denis = need(ctx.ids.students, "denis", "студента");

  async function past(
    studentId: string,
    level: EducationLevelCode,
    semester: number,
    list: readonly PastResult[],
  ) {
    const rows: Prisma.AssessmentCreateManyInput[] = list.map((r) => {
      const day = resolve(r.date, ctx);
      return {
        studentId,
        disciplineId: need(refs.disciplines, r.discipline, "дисциплины"),
        semester,
        controlForm: r.form,
        score: r.score,
        // Оценка по шкале уровня (N-03), а не отдельным значением в обход шкалы.
        grade: gradeFor(r.score, r.form, level, bands).grade,
        attempt: 0,
        date: moscowDateTime(day, "10:00"),
      };
    });
    await tx.assessment.createMany({ data: rows });
  }

  async function current(
    studentId: string,
    groupCode: string,
    template: WeekTemplate,
    semester: number,
    list: readonly SessionControl[],
  ) {
    const groupId = need(ctx.ids.groups, groupCode, "группы");
    for (const c of list) {
      const day = controlDay(c, ctx);
      const bell = bellByPair(c.pair);
      const slot = slotOf(template, c.discipline);
      const disciplineId = need(refs.disciplines, c.discipline, "дисциплины");
      const startsAt = moscowDateTime(day, bell.start);
      await tx.scheduleEvent.create({
        data: {
          groupId,
          disciplineId,
          teacherId: need(refs.teachers, slot.teacher, "преподавателя"),
          roomId: need(refs.rooms, slot.room, "аудитории"),
          type: eventType(c.form),
          startsAt,
          endsAt: moscowDateTime(day, bell.end),
        },
      });
      await tx.assessment.create({
        data: {
          studentId,
          disciplineId,
          semester,
          controlForm: c.form,
          attempt: 0,
          date: startsAt,
        },
      });
    }
  }

  await past(alina, "BACHELOR", 1, ALINA_SEMESTER_1);
  await past(alina, "BACHELOR", 2, ALINA_SEMESTER_2);
  await current(alina, "ПС-251", PS251, 3, ALINA_SEMESTER_3);
  await current(denis, "МП-261", MP261, 1, DENIS_SEMESTER_1);

  // Задолженность Алины: экзамен летней сессии, этап I, крайний срок через календарный год (N-10).
  const debtResult = ALINA_SEMESTER_2.find((r) => r.discipline === ALINA_DEBT_DISCIPLINE);
  if (!debtResult) throw new Error("Нет результата задолженности");
  const formed = resolve(debtResult.date, ctx);
  const debtDisciplineId = need(refs.disciplines, ALINA_DEBT_DISCIPLINE, "дисциплины");
  await tx.academicDebt.create({
    data: {
      studentId: alina,
      disciplineId: debtDisciplineId,
      formedAt: dateOnly(formed),
      stage: "STAGE_1",
      deadline: dateOnly(addCalendarYear(formed)),
    },
  });
  return { debtDisciplineId };
}

function eventType(form: ControlForm): "EXAM" | "CREDIT" {
  return form === "EXAM" ? "EXAM" : "CREDIT";
}
