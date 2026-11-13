// Доступ к базе только для тестов: достать ID демо-записей и почистить попытки входа.
// Единственное место вне src/server/dal, где разрешён Prisma (см. CLAUDE.md и отчёт задания 2).

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { type ApplicationTypeCode, PrismaClient } from "../../src/generated/prisma/client";

let client: PrismaClient | null = null;

function db(): PrismaClient {
  if (!client) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL не задан для e2e");
    client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  }
  return client;
}

/** ID заявки демо-студента по типу. Падает, если сид не выполнен. */
export async function applicationId(
  login: "alina" | "denis",
  type: ApplicationTypeCode,
): Promise<string> {
  const app = await db().application.findFirst({
    where: { type: { code: type }, student: { user: { login } } },
    select: { id: true },
  });
  if (!app) throw new Error(`Нет заявки ${type} у ${login}: выполните npm run demo:reset`);
  return app.id;
}

export async function clearLoginAttempts(login: string): Promise<void> {
  await db().loginAttempt.deleteMany({ where: { login } });
}

export async function disconnect(): Promise<void> {
  await client?.$disconnect();
  client = null;
}

/** Число непрочитанных уведомлений демо-пользователя: ожидание для колокольчика. */
export async function unreadCount(login: string): Promise<number> {
  return db().notification.count({ where: { recipient: { login }, isRead: false } });
}

/** Уведомление демо-пользователя по началу заголовка: id и признак прочтения. */
export async function notificationOf(
  login: string,
  titlePrefix: string,
): Promise<{ id: string; isRead: boolean; link: string | null; title: string }> {
  const row = await db().notification.findFirst({
    where: { recipient: { login }, title: { startsWith: titlePrefix } },
    orderBy: { createdAt: "desc" },
    select: { id: true, isRead: true, link: true, title: true },
  });
  if (!row)
    throw new Error(`Нет уведомления «${titlePrefix}» у ${login}: выполните npm run demo:reset`);
  return row;
}

/** Смена аудитории из сида (ПС-251, ближайший учебный день): «было → стало». */
export async function roomChange(): Promise<{ from: string; to: string; eventId: string }> {
  const row = await db().scheduleChange.findFirst({
    where: { field: "ROOM", event: { group: { code: "ПС-251" } } },
    select: { oldValue: true, newValue: true, eventId: true },
  });
  if (!row) throw new Error("Нет смены аудитории в сиде: выполните npm run demo:reset");
  return { from: row.oldValue, to: row.newValue, eventId: row.eventId };
}

/** Названия дисциплин группы: проверка, что чужое расписание не видно. */
export async function disciplinesOfGroup(code: string): Promise<string[]> {
  const rows = await db().discipline.findMany({
    where: { scheduleEvents: { some: { group: { code } } } },
    select: { name: true },
  });
  return rows.map((r) => r.name);
}

/** Дисциплина пересдачи демо-студента. */
export async function retakeDiscipline(login: string): Promise<string> {
  const row = await db().scheduleEvent.findFirst({
    where: { type: "RETAKE_1", student: { user: { login } } },
    select: { discipline: { select: { name: true } } },
  });
  if (!row) throw new Error(`Нет пересдачи у ${login}`);
  return row.discipline.name;
}

/** Задолженность демо-студента: id оценки, сроки и пересдача (ожидания для «Учёбы»). */
export async function debtOf(login: string): Promise<{
  assessmentId: string;
  formedAt: string;
  deadline: string;
  retakeAt: Date;
}> {
  const debt = await db().academicDebt.findFirst({
    where: { student: { user: { login } }, status: "OPEN" },
    select: { formedAt: true, deadline: true, disciplineId: true, studentId: true },
  });
  if (!debt) throw new Error(`Нет задолженности у ${login}`);
  const assessment = await db().assessment.findFirst({
    where: { studentId: debt.studentId, disciplineId: debt.disciplineId, grade: "UNSATISFACTORY" },
    select: { id: true },
  });
  const retake = await db().scheduleEvent.findFirst({
    where: { studentId: debt.studentId, disciplineId: debt.disciplineId, type: "RETAKE_1" },
    select: { startsAt: true },
  });
  if (!assessment || !retake) throw new Error(`Нет оценки или пересдачи у ${login}`);
  return {
    assessmentId: assessment.id,
    formedAt: debt.formedAt.toISOString().slice(0, 10),
    deadline: debt.deadline.toISOString().slice(0, 10),
    retakeAt: retake.startsAt,
  };
}

/** Оценка текущего семестра (без результата) по форме контроля. */
export async function currentAssessmentOf(
  login: string,
  controlForm: "EXAM" | "CREDIT" | "DIFF_CREDIT",
): Promise<{ id: string; discipline: string }> {
  const row = await db().assessment.findFirst({
    where: { student: { user: { login } }, score: null, controlForm },
    orderBy: { date: "asc" },
    select: { id: true, discipline: { select: { name: true } } },
  });
  if (!row) throw new Error(`Нет дисциплины ${controlForm} у ${login}`);
  return { id: row.id, discipline: row.discipline.name };
}

/** Даты контроля текущего семестра (зачёты Дениса и т.п.). */
export async function controlDatesOf(login: string): Promise<Date[]> {
  const rows = await db().assessment.findMany({
    where: { student: { user: { login } }, score: null },
    orderBy: { date: "asc" },
    select: { date: true },
  });
  return rows.map((r) => r.date);
}
