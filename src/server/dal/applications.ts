import "server-only";

import { z } from "zod";

import type {
  ApplicationStatus,
  ApplicationTypeCode,
  Prisma,
  ScheduleEventType,
} from "@/generated/prisma/client";
import {
  type DateKey,
  addDays,
  dateOnly,
  moscowDateTime,
  toDateKey,
  todayInMoscow,
} from "@/lib/moscow-date";
import type { StaffActor, StudentActor } from "@/server/auth/guards";
import { getDb } from "@/server/db";
import {
  allowedTransitions,
  applicationLimitReached,
  canStudentCancel,
  countActiveApplications,
  findBranch,
  nextStageDeadline,
  parseStages,
} from "@/server/rules/application-stages";
import type { ProductionCalendar } from "@/server/rules/working-days";

import { loadCalendar } from "./calendar";
import { type DbTx, inTransaction } from "./client";
import { notifyApplicationStatus } from "./notifications";

// Заявки: подача и отмена студентом (S4a, S4b, S5), смена статуса сотрудником (E2).
// Студент работает только со своими заявками (actor.studentId), сотрудник — только с заявками
// своего подразделения (actor.unitId). Чужая и несуществующая заявка дают одинаковый ответ.

const idSchema = z.cuid();

const documentSchema = z.object({
  title: z.string(),
  normCode: z.string().nullable(),
  code: z.string().optional(),
  reason: z.string().optional(),
});

export type RequiredDocument = z.infer<typeof documentSchema>;

export function parseDocuments(json: Prisma.JsonValue): RequiredDocument[] {
  return z.array(documentSchema).parse(json);
}

/** Производственный календарь для сроков в карточке заявки. Справочник, данных пользователя нет. */
export async function getProductionCalendar(actor: {
  userId: string;
}): Promise<ProductionCalendar> {
  void actor; // Вызывающий обязан пройти guard.
  return loadCalendar(getDb());
}

/** Каталог S4a: типы, доступные уровню образования студента. */
export async function listApplicationCatalog(actor: StudentActor) {
  return getDb().applicationType.findMany({
    where: { levels: { some: { code: actor.levelCode } } },
    orderBy: { title: "asc" },
    select: {
      code: true,
      title: true,
      isInformational: true,
      description: true,
      normCodes: true,
      unit: { select: { code: true, name: true } },
    },
  });
}

/** Тип заявки для формы, если он доступен уровню студента. */
export async function getApplicationTypeForStudent(actor: StudentActor, code: ApplicationTypeCode) {
  const row = await getDb().applicationType.findFirst({
    where: { code, levels: { some: { code: actor.levelCode } } },
    select: {
      code: true,
      title: true,
      isInformational: true,
      description: true,
      normCodes: true,
      requiredDocuments: true,
      stages: true,
      unit: { select: { name: true } },
    },
  });
  if (!row) return null;
  const calendar = await loadCalendar(getDb());
  return {
    ...row,
    stages: parseStages(row.stages),
    requiredDocuments: parseDocuments(row.requiredDocuments),
    calendar,
  };
}

const CONTROL_TYPES: ScheduleEventType[] = ["CREDIT", "EXAM", "RETAKE_1", "RETAKE_2"];

export type AbsenceCandidate = {
  id: string;
  discipline: string;
  type: ScheduleEventType;
  startsAt: Date;
};

/**
 * Контроль, о неявке на который можно сообщить (S5): зачёты, экзамены и пересдачи студента
 * за последние две недели и на три месяца вперёд. Срок сообщить проверяет форма (N-04).
 */
export async function getAbsenceContext(
  actor: StudentActor,
  now: Date = new Date(),
): Promise<{
  candidates: AbsenceCandidate[];
  calendar: ProductionCalendar;
  today: DateKey;
}> {
  const db = getDb();
  const today = todayInMoscow(now);
  const profile = await db.studentProfile.findUnique({
    where: { id: actor.studentId },
    select: { groupId: true },
  });
  if (!profile) return { candidates: [], calendar: await loadCalendar(db), today };
  const [rows, calendar] = await Promise.all([
    db.scheduleEvent.findMany({
      where: {
        type: { in: CONTROL_TYPES },
        // Отменённый контроль (ScheduleChange CANCELLED = true) не проводится: сообщать не о чем.
        changes: { none: { field: "CANCELLED", newValue: "true" } },
        OR: [{ groupId: profile.groupId }, { studentId: actor.studentId }],
        startsAt: {
          gte: moscowDateTime(addDays(today, -14), "00:00"),
          lt: moscowDateTime(addDays(today, 92), "00:00"),
        },
      },
      orderBy: { startsAt: "asc" },
      select: { id: true, type: true, startsAt: true, discipline: { select: { name: true } } },
    }),
    loadCalendar(db),
  ]);
  return {
    candidates: rows.map((r) => ({
      id: r.id,
      discipline: r.discipline.name,
      type: r.type,
      startsAt: r.startsAt,
    })),
    calendar,
    today,
  };
}

export type NewApplication = {
  typeCode: ApplicationTypeCode;
  branch: string;
  formData: Prisma.InputJsonObject;
  willBringOriginal: boolean;
};

/**
 * Подать заявку. Тип должен быть доступен уровню студента и не быть информационным,
 * ветка — существовать у типа. Подразделение и срок берутся из типа, не из формы.
 * Возвращает id заявки или null.
 */
export type CreateResult = { ok: true; id: string } | { ok: false; error: "NOT_FOUND" | "LIMIT" };

async function countActive(tx: DbTx, studentId: string): Promise<number> {
  const rows = await tx.application.findMany({
    where: { studentId, status: { notIn: ["REJECTED", "CANCELLED"] } },
    select: { status: true, branch: true, type: { select: { stages: true } } },
  });
  return countActiveApplications(
    rows.map((r) => ({ status: r.status, branch: r.branch, stages: parseStages(r.type.stages) })),
  );
}

/** Сколько активных заявок у студента и достигнут ли лимит (S4, S4a, S5). */
export async function getApplicationLimit(
  actor: StudentActor,
): Promise<{ active: number; reached: boolean }> {
  const active = await countActive(getDb(), actor.studentId);
  return { active, reached: applicationLimitReached(active) };
}

export async function createApplication(
  actor: StudentActor,
  input: NewApplication,
  options: { now?: Date } = {},
): Promise<CreateResult> {
  const now = options.now ?? new Date();
  return getDb().$transaction(async (tx) => {
    // Блокировка строки студента: две одновременные подачи не обойдут лимит.
    await tx.$executeRaw`SELECT 1 FROM "StudentProfile" WHERE "id" = ${actor.studentId} FOR UPDATE`;
    if (applicationLimitReached(await countActive(tx, actor.studentId))) {
      return { ok: false, error: "LIMIT" };
    }
    const type = await tx.applicationType.findFirst({
      where: {
        code: input.typeCode,
        isInformational: false,
        levels: { some: { code: actor.levelCode } },
      },
      select: { id: true, unitId: true, stages: true },
    });
    if (!type) return { ok: false, error: "NOT_FOUND" };
    const branch = findBranch(parseStages(type.stages), input.branch);
    if (!branch) return { ok: false, error: "NOT_FOUND" };
    const calendar = await loadCalendar(tx);
    const today = toDateKey(now);
    const deadline = nextStageDeadline(
      branch,
      "SUBMITTED",
      { submitted: today, enteredCurrent: today },
      calendar,
    );
    const app = await tx.application.create({
      data: {
        studentId: actor.studentId,
        typeId: type.id,
        unitId: type.unitId,
        branch: branch.code,
        status: "SUBMITTED",
        formData: input.formData,
        willBringOriginal: input.willBringOriginal,
        stageDeadline: deadline ? dateOnly(deadline) : null,
        createdAt: now,
        events: {
          create: {
            fromStatus: null,
            toStatus: "SUBMITTED",
            actorUserId: actor.userId,
            createdAt: now,
          },
        },
      },
      select: { id: true },
    });
    return { ok: true, id: app.id };
  });
}

/** Отменить свою заявку до того, как её взяли в работу. false — нечего отменять. */
export async function cancelApplication(
  actor: StudentActor,
  id: string,
  options: { now?: Date } = {},
): Promise<boolean> {
  if (!idSchema.safeParse(id).success) return false;
  const now = options.now ?? new Date();
  return getDb().$transaction(async (tx) => {
    const app = await tx.application.findFirst({
      where: { id, studentId: actor.studentId },
      select: { status: true },
    });
    if (!app || !canStudentCancel(app.status)) return false;
    // Условие на статус в самом обновлении: если сотрудник успел взять заявку, отмены нет.
    const updated = await tx.application.updateMany({
      where: { id, studentId: actor.studentId, status: app.status },
      data: { status: "CANCELLED", stageDeadline: null },
    });
    if (updated.count !== 1) return false;
    await tx.applicationEvent.create({
      data: {
        applicationId: id,
        fromStatus: app.status,
        toStatus: "CANCELLED",
        comment: "Отменено студентом.",
        actorUserId: actor.userId,
        createdAt: now,
      },
    });
    return true;
  });
}

export type StatusChangeResult =
  { ok: true } | { ok: false; error: "NOT_FOUND" | "NOT_ALLOWED" | "REASON_REQUIRED" | "CONFLICT" };

/**
 * Сменить статус заявки своего подразделения (E2). Разрешены только переходы из правил
 * этапов; при отказе причина обязательна (N-46). Студент получает уведомление.
 */
export async function changeApplicationStatus(
  actor: StaffActor,
  input: { id: string; to: ApplicationStatus; comment: string },
  options: { now?: Date; tx?: DbTx } = {},
): Promise<StatusChangeResult> {
  if (!idSchema.safeParse(input.id).success) return { ok: false, error: "NOT_FOUND" };
  const now = options.now ?? new Date();
  const comment = input.comment.trim();
  return inTransaction(options.tx, async (tx) => {
    const app = await tx.application.findFirst({
      where: { id: input.id, unitId: actor.unitId },
      select: { status: true, branch: true, createdAt: true, typeId: true },
    });
    if (!app) return { ok: false, error: "NOT_FOUND" };
    const type = await tx.applicationType.findUniqueOrThrow({
      where: { id: app.typeId },
      select: { stages: true },
    });
    const branch = findBranch(parseStages(type.stages), app.branch);
    const transition = allowedTransitions(branch, app.status).find((t) => t.to === input.to);
    if (!branch || !transition) return { ok: false, error: "NOT_ALLOWED" };
    if (transition.kind === "reject" && comment.length === 0) {
      return { ok: false, error: "REASON_REQUIRED" };
    }
    const calendar = await loadCalendar(tx);
    const today = toDateKey(now);
    const deadline =
      transition.kind === "reject"
        ? null
        : nextStageDeadline(
            branch,
            input.to,
            { submitted: toDateKey(app.createdAt), enteredCurrent: today },
            calendar,
          );
    const updated = await tx.application.updateMany({
      where: { id: input.id, unitId: actor.unitId, status: app.status },
      data: { status: input.to, stageDeadline: deadline ? dateOnly(deadline) : null },
    });
    if (updated.count !== 1) return { ok: false, error: "CONFLICT" };
    await tx.applicationEvent.create({
      data: {
        applicationId: input.id,
        fromStatus: app.status,
        toStatus: input.to,
        comment: comment.length > 0 ? comment : null,
        actorUserId: actor.userId,
        createdAt: now,
      },
    });
    await notifyApplicationStatus(actor, input.id, {
      tx,
      now,
      comment: comment.length > 0 ? comment : undefined,
    });
    return { ok: true };
  });
}

/** Лимит и текст правила о нём (APPLICATION_LIMIT) для экранов S4, S4a, S5. */
export async function getApplicationLimitView(
  actor: StudentActor,
): Promise<{ active: number; reached: boolean; text: string }> {
  const [limit, rule] = await Promise.all([
    getApplicationLimit(actor),
    getDb().rule.findFirst({
      where: { trigger: "APPLICATION_LIMIT", levels: { some: { code: actor.levelCode } } },
      select: { body: true },
    }),
  ]);
  return { ...limit, text: rule?.body ?? "" };
}
