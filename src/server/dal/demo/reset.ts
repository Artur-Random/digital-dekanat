import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { ApplicationStatus, ApplicationTypeCode, Prisma } from "@/generated/prisma/client";
import { type DateKey, dateOnly, moscowDateTime, todayInMoscow } from "@/lib/moscow-date";
import { parseNormsRegistry } from "@/lib/norms-registry";
import { hashPassword } from "@/server/auth/password";
import { getDb } from "@/server/db";
import { addWorkingDays, subtractWorkingDays } from "@/server/rules/working-days";

import { APPLICATION_TYPES, stagesSchema } from "./application-types";
import { HOLIDAYS } from "./holidays";
import { EDUCATION_LEVELS, GROUPS, INSTITUTE, STAFF, STUDENTS, UNITS } from "./people";

type Tx = Prisma.TransactionClient;

export type ResetOptions = {
  /** «Сегодня» по Москве; по умолчанию текущая дата. */
  today?: DateKey;
  /** Путь к реестру норм; по умолчанию docs/norms-registry.md от корня проекта. */
  registryPath?: string;
  env?: Record<string, string | undefined>;
};

export type ResetSummary = Record<string, number>;

export type SeedContext = {
  today: DateKey;
  holidays: Set<DateKey>;
  ids: {
    levels: Map<string, string>;
    units: Map<string, string>;
    groups: Map<string, string>;
    users: Map<string, string>;
    students: Map<string, string>;
    staffUsers: Map<string, string>;
    applicationTypes: Map<ApplicationTypeCode, string>;
  };
};

function requirePasswords(env: Record<string, string | undefined>): Map<string, string> {
  const result = new Map<string, string>();
  const missing: string[] = [];
  for (const person of [...STUDENTS, ...STAFF]) {
    const value = env[person.passwordEnv];
    if (!value) missing.push(person.passwordEnv);
    else result.set(person.login, value);
  }
  if (missing.length > 0) {
    // Имена переменных, не значения.
    throw new Error(`Не заданы пароли демо-аккаунтов: ${missing.join(", ")}. Задайте их в .env.`);
  }
  return result;
}

async function wipe(tx: Tx): Promise<void> {
  // Порядок от зависимых к независимым.
  await tx.notification.deleteMany();
  await tx.attachment.deleteMany();
  await tx.applicationEvent.deleteMany();
  await tx.application.deleteMany();
  await tx.scheduleChange.deleteMany();
  await tx.scheduleEvent.deleteMany();
  await tx.assessment.deleteMany();
  await tx.academicDebt.deleteMany();
  await tx.session.deleteMany();
  await tx.loginAttempt.deleteMany();
  await tx.staffProfile.deleteMany();
  await tx.studentProfile.deleteMany();
  await tx.user.deleteMany();
  await tx.group.deleteMany();
  await tx.applicationType.deleteMany();
  await tx.gradeBand.deleteMany();
  await tx.rule.deleteMany();
  await tx.educationLevel.deleteMany();
  await tx.unit.deleteMany();
  await tx.discipline.deleteMany();
  await tx.teacher.deleteMany();
  await tx.room.deleteMany();
  await tx.norm.deleteMany();
  await tx.holiday.deleteMany();
}

// ---------------------------------------------------------------------------
// Блоки сида. Новый блок (расписание, оценки, долги, уведомления) добавляется функцией
// с той же сигнатурой и строкой в SEED_BLOCKS.
// ---------------------------------------------------------------------------

async function seedReferenceData(tx: Tx, ctx: SeedContext): Promise<void> {
  for (const level of EDUCATION_LEVELS) {
    const row = await tx.educationLevel.create({ data: level });
    ctx.ids.levels.set(level.code, row.id);
  }
  for (const unit of UNITS) {
    const row = await tx.unit.create({ data: unit });
    ctx.ids.units.set(unit.code, row.id);
  }
  await tx.holiday.createMany({
    data: HOLIDAYS.map((h) => ({ date: dateOnly(h.date), kind: h.kind, source: h.source })),
  });
}

/** Шкала оценок строго по N-03 для уровней с заполненными правилами. */
async function seedGradeBands(tx: Tx, ctx: SeedContext): Promise<void> {
  const graded = [
    { grade: "UNSATISFACTORY", min: 0, max: 50, positive: false },
    { grade: "SATISFACTORY", min: 51, max: 65, positive: true },
    { grade: "GOOD", min: 66, max: 80, positive: true },
    { grade: "EXCELLENT", min: 81, max: 100, positive: true },
  ] as const;
  const credit = [
    { grade: "FAILED", min: 0, max: 50, positive: false },
    { grade: "PASSED", min: 51, max: 100, positive: true },
  ] as const;
  const rows: Prisma.GradeBandCreateManyInput[] = [];
  for (const level of EDUCATION_LEVELS.filter((l) => l.rulesFilled)) {
    const levelId = ctx.ids.levels.get(level.code);
    if (!levelId) throw new Error(`Нет уровня ${level.code}`);
    for (const controlForm of ["EXAM", "DIFF_CREDIT"] as const) {
      for (const b of graded) {
        rows.push({
          levelId,
          controlForm,
          grade: b.grade,
          minScore: b.min,
          maxScore: b.max,
          isPositive: b.positive,
          normCode: "N-03",
        });
      }
    }
    for (const b of credit) {
      rows.push({
        levelId,
        controlForm: "CREDIT",
        grade: b.grade,
        minScore: b.min,
        maxScore: b.max,
        isPositive: b.positive,
        normCode: "N-03",
      });
    }
  }
  await tx.gradeBand.createMany({ data: rows });
}

function makeSeedNorms(registryPath: string) {
  return async (tx: Tx): Promise<void> => {
    const norms = parseNormsRegistry(readFileSync(registryPath, "utf8"));
    await tx.norm.createMany({ data: norms });
  };
}

async function seedApplicationTypes(tx: Tx, ctx: SeedContext): Promise<void> {
  const levelIds = EDUCATION_LEVELS.filter((l) => l.rulesFilled).map((l) => {
    const id = ctx.ids.levels.get(l.code);
    if (!id) throw new Error(`Нет уровня ${l.code}`);
    return { id };
  });
  for (const type of APPLICATION_TYPES) {
    const unitId = ctx.ids.units.get(type.unit);
    if (!unitId) throw new Error(`Нет подразделения ${type.unit}`);
    const row = await tx.applicationType.create({
      data: {
        code: type.code,
        title: type.title,
        unitId,
        isInformational: type.isInformational,
        description: type.description,
        stages: stagesSchema.parse(type.stages),
        formFields: type.formFields,
        requiredDocuments: type.requiredDocuments,
        normCodes: type.normCodes,
        levels: { connect: levelIds },
      },
    });
    ctx.ids.applicationTypes.set(type.code, row.id);
  }
}

function makeSeedPeople(hashes: Map<string, string>) {
  return async (tx: Tx, ctx: SeedContext): Promise<void> => {
    for (const group of GROUPS) {
      const levelId = ctx.ids.levels.get(group.level);
      if (!levelId) throw new Error(`Нет уровня ${group.level}`);
      const row = await tx.group.create({
        data: { code: group.code, levelId, course: group.course },
      });
      ctx.ids.groups.set(group.code, row.id);
    }
    for (const s of STUDENTS) {
      const levelId = ctx.ids.levels.get(s.level);
      const groupId = ctx.ids.groups.get(s.group);
      if (!levelId || !groupId) throw new Error(`Нет уровня или группы для ${s.login}`);
      const user = await tx.user.create({
        data: {
          login: s.login,
          passwordHash: requireHash(hashes, s.login),
          role: "STUDENT",
          student: {
            create: {
              fullName: s.fullName,
              institute: INSTITUTE,
              programCode: s.programCode,
              programName: s.programName,
              profile: s.profile,
              levelId,
              studyForm: s.studyForm,
              funding: s.funding,
              course: s.course,
              groupId,
            },
          },
        },
        include: { student: true },
      });
      ctx.ids.users.set(s.login, user.id);
      if (user.student) ctx.ids.students.set(s.login, user.student.id);
    }
    for (const s of STAFF) {
      const unitId = ctx.ids.units.get(s.unit);
      if (!unitId) throw new Error(`Нет подразделения ${s.unit}`);
      const user = await tx.user.create({
        data: {
          login: s.login,
          passwordHash: requireHash(hashes, s.login),
          role: "STAFF",
          staff: { create: { fullName: s.fullName, position: s.position, unitId } },
        },
      });
      ctx.ids.users.set(s.login, user.id);
      ctx.ids.staffUsers.set(s.unit, user.id);
    }
  };
}

function requireHash(hashes: Map<string, string>, login: string): string {
  const hash = hashes.get(login);
  if (!hash) throw new Error(`Нет хэша пароля для ${login}`);
  return hash;
}

type DemoApplication = {
  student: "alina" | "denis";
  type: ApplicationTypeCode;
  formData: Prisma.InputJsonValue;
  willBringOriginal?: boolean;
  /** Подано столько рабочих дней назад. */
  submittedWorkingDaysAgo: number;
  /** История: статус, через сколько рабочих дней после подачи, кто, комментарий. */
  history: {
    status: ApplicationStatus;
    afterDays: number;
    by: "student" | "staff";
    comment?: string;
  }[];
  /** Срок текущего этапа в рабочих днях от подачи (null — без срока). */
  stageDeadlineDays: number | null;
};

const DEMO_APPLICATIONS: readonly DemoApplication[] = [
  {
    student: "alina",
    type: "CERT_ENROLLMENT",
    formData: { destination: "По месту требования", copies: 1 },
    submittedWorkingDaysAgo: 3,
    history: [
      { status: "SUBMITTED", afterDays: 0, by: "student" },
      { status: "IN_PROGRESS", afterDays: 1, by: "staff" },
      { status: "READY", afterDays: 2, by: "staff", comment: "Справка готова, забрать в МФЦ." },
    ],
    stageDeadlineDays: null,
  },
  {
    student: "alina",
    type: "PA_EXTENSION",
    formData: {
      event: "Повторная промежуточная аттестация",
      reason: "ILLNESS",
      absenceFrom: -6,
      absenceTo: -2,
    },
    willBringOriginal: true,
    submittedWorkingDaysAgo: 1,
    history: [{ status: "SUBMITTED", afterDays: 0, by: "student" }],
    stageDeadlineDays: 5,
  },
  {
    student: "denis",
    type: "CERT_SUMMONS",
    formData: { destination: "По месту работы", copies: 1 },
    submittedWorkingDaysAgo: 1,
    history: [
      { status: "SUBMITTED", afterDays: 0, by: "student" },
      { status: "IN_PROGRESS", afterDays: 1, by: "staff" },
    ],
    stageDeadlineDays: 3,
  },
];

async function seedApplications(tx: Tx, ctx: SeedContext): Promise<void> {
  for (const app of DEMO_APPLICATIONS) {
    const typeSeed = APPLICATION_TYPES.find((t) => t.code === app.type);
    const typeId = ctx.ids.applicationTypes.get(app.type);
    const studentId = ctx.ids.students.get(app.student);
    const studentUserId = ctx.ids.users.get(app.student);
    const unitId = typeSeed ? ctx.ids.units.get(typeSeed.unit) : undefined;
    const staffUserId = typeSeed ? ctx.ids.staffUsers.get(typeSeed.unit) : undefined;
    if (!typeSeed || !typeId || !studentId || !studentUserId || !unitId) {
      throw new Error(`Не хватает данных для заявки ${app.student}/${app.type}`);
    }
    const submitted = subtractWorkingDays(ctx.today, app.submittedWorkingDaysAgo, ctx.holidays);
    const last = app.history.at(-1);
    if (!last) throw new Error("У заявки нет истории");

    // Даты отсутствия в formData заданы смещением в днях от подачи.
    const formData = resolveRelativeDates(app.formData, submitted);

    await tx.application.create({
      data: {
        studentId,
        typeId,
        unitId,
        status: last.status,
        formData,
        willBringOriginal: app.willBringOriginal ?? false,
        stageDeadline:
          app.stageDeadlineDays === null
            ? null
            : dateOnly(addWorkingDays(submitted, app.stageDeadlineDays, ctx.holidays)),
        createdAt: moscowDateTime(submitted, "10:15"),
        events: {
          create: app.history.map((h, index) => ({
            fromStatus: index === 0 ? null : (app.history[index - 1]?.status ?? null),
            toStatus: h.status,
            comment: h.comment ?? null,
            actorUserId: h.by === "student" ? studentUserId : (staffUserId ?? null),
            createdAt: moscowDateTime(
              addWorkingDays(submitted, h.afterDays, ctx.holidays),
              h.afterDays === 0 ? "10:15" : "14:30",
            ),
          })),
        },
      },
    });
  }
}

function resolveRelativeDates(data: Prisma.InputJsonValue, base: DateKey): Prisma.InputJsonValue {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return data;
  const result: Record<string, Prisma.InputJsonValue> = {};
  for (const [key, value] of Object.entries(data)) {
    if ((key === "absenceFrom" || key === "absenceTo") && typeof value === "number") {
      const d = new Date(`${base}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + value);
      result[key] = d.toISOString().slice(0, 10);
    } else if (value !== undefined && value !== null) {
      result[key] = value as Prisma.InputJsonValue;
    }
  }
  return result;
}

/**
 * Полный сброс демо-данных: удаляет всё и заполняет заново с датами от «сегодня» по Москве.
 * Идемпотентен: повторный запуск даёт то же состояние. Используется как prisma seed
 * и ночным сбросом в 04:00 МСК.
 */
export async function resetDemoData(options: ResetOptions = {}): Promise<ResetSummary> {
  const db = getDb();
  const env = options.env ?? process.env;
  const passwords = requirePasswords(env);
  const registryPath = options.registryPath ?? join(process.cwd(), "docs", "norms-registry.md");
  // Реестр читаем до транзакции: при ошибке формата база не тронута.
  parseNormsRegistry(readFileSync(registryPath, "utf8"));

  // argon2 медленный намеренно, поэтому хэши считаем до транзакции.
  const hashes = new Map(
    await Promise.all(
      [...passwords].map(
        async ([login, password]) => [login, await hashPassword(password)] as const,
      ),
    ),
  );

  const ctx: SeedContext = {
    today: options.today ?? todayInMoscow(),
    holidays: new Set(HOLIDAYS.map((h) => h.date)),
    ids: {
      levels: new Map(),
      units: new Map(),
      groups: new Map(),
      users: new Map(),
      students: new Map(),
      staffUsers: new Map(),
      applicationTypes: new Map(),
    },
  };

  const blocks: ((tx: Tx, ctx: SeedContext) => Promise<void>)[] = [
    seedReferenceData,
    seedGradeBands,
    makeSeedNorms(registryPath),
    seedApplicationTypes,
    makeSeedPeople(hashes),
    seedApplications,
    // TODO(задания 4–6): расписание, оценки и долги, уведомления, тексты Rule.
  ];

  await db.$transaction(
    async (tx) => {
      await wipe(tx);
      for (const block of blocks) await block(tx, ctx);
    },
    { timeout: 60_000 },
  );

  return countRows();
}

export async function countRows(): Promise<ResetSummary> {
  const db = getDb();
  const [
    levels,
    units,
    holidays,
    gradeBands,
    norms,
    applicationTypes,
    users,
    students,
    staff,
    groups,
    applications,
    applicationEvents,
  ] = await Promise.all([
    db.educationLevel.count(),
    db.unit.count(),
    db.holiday.count(),
    db.gradeBand.count(),
    db.norm.count(),
    db.applicationType.count(),
    db.user.count(),
    db.studentProfile.count(),
    db.staffProfile.count(),
    db.group.count(),
    db.application.count(),
    db.applicationEvent.count(),
  ]);
  return {
    levels,
    units,
    holidays,
    gradeBands,
    norms,
    applicationTypes,
    users,
    students,
    staff,
    groups,
    applications,
    applicationEvents,
  };
}
