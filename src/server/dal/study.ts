import "server-only";

import { normLabel } from "@/lib/norm-label";
import { z } from "zod";

import type { StudentActor } from "@/server/auth/guards";
import { getDb } from "@/server/db";
import { toDateKey } from "@/lib/moscow-date";
import type { RetakeInput } from "@/server/rules/debts";
import type { GradeBandInput } from "@/server/rules/grades";
import type { RuleText } from "@/server/rules/rule-text";

import { loadCalendar } from "./calendar";
import { listNorms } from "./norms";

// Всё фильтруется по actor.studentId из сессии. Чужой или несуществующий id оценки даёт null,
// страница отвечает notFound() одинаково в обоих случаях.

const idSchema = z.cuid();

const assessmentSelect = {
  id: true,
  semester: true,
  controlForm: true,
  score: true,
  grade: true,
  attempt: true,
  date: true,
  disciplineId: true,
  discipline: { select: { name: true } },
} as const;

async function profileOf(actor: StudentActor) {
  return getDb().studentProfile.findUnique({
    where: { id: actor.studentId },
    select: { studyForm: true, funding: true, level: { select: { code: true } } },
  });
}

/** Шкала оценок уровня студента (N-03). */
async function bandsFor(actor: StudentActor): Promise<GradeBandInput[]> {
  const rows = await getDb().gradeBand.findMany({
    where: { level: { code: actor.levelCode } },
    select: { controlForm: true, minScore: true, maxScore: true, grade: true, isPositive: true },
  });
  return rows.map((r) => ({ ...r, levelCode: actor.levelCode }));
}

/** Тексты правил для уровня студента. Отбор «только бюджет» делают rules (what-if, stipend). */
export async function getRulesForStudent(actor: StudentActor): Promise<RuleText[]> {
  const rows = await getDb().rule.findMany({
    where: { levels: { some: { code: actor.levelCode } } },
    select: {
      trigger: true,
      title: true,
      body: true,
      normCodes: true,
      stipendOnly: true,
      prototypeAssumption: true,
    },
  });
  return rows;
}

export async function listSemesters(actor: StudentActor) {
  const rows = await getDb().assessment.findMany({
    where: { studentId: actor.studentId },
    select: { semester: true, grade: true },
  });
  const semesters = [...new Set(rows.map((r) => r.semester))].sort((a, b) => a - b);
  const withResults = new Set(rows.filter((r) => r.grade !== null).map((r) => r.semester));
  return semesters.map((s) => ({ semester: s, hasResults: withResults.has(s) }));
}

export async function listAssessments(actor: StudentActor, semester: number) {
  const [rows, bands] = await Promise.all([
    getDb().assessment.findMany({
      where: { studentId: actor.studentId, semester },
      orderBy: [{ date: "asc" }, { id: "asc" }],
      select: assessmentSelect,
    }),
    bandsFor(actor),
  ]);
  return { rows, bands };
}

/** Открытые задолженности студента и оценка, по которой каждая образовалась. */
export async function getDebts(actor: StudentActor) {
  const debts = await getDb().academicDebt.findMany({
    where: { studentId: actor.studentId, status: "OPEN" },
    orderBy: { deadline: "asc" },
    select: {
      id: true,
      disciplineId: true,
      formedAt: true,
      stage: true,
      deadline: true,
      discipline: { select: { name: true } },
    },
  });
  const failing = await getDb().assessment.findMany({
    where: {
      studentId: actor.studentId,
      disciplineId: { in: debts.map((d) => d.disciplineId) },
      grade: { in: ["UNSATISFACTORY", "FAILED"] },
    },
    orderBy: { date: "asc" },
    select: { id: true, disciplineId: true },
  });
  return debts.map((d) => ({
    ...d,
    formedAt: d.formedAt.toISOString().slice(0, 10),
    deadline: d.deadline.toISOString().slice(0, 10),
    assessmentId: failing.find((a) => a.disciplineId === d.disciplineId)?.id ?? null,
  }));
}

/** Данные для статуса стипендии: форма, основа, результаты и задолженности студента. */
export async function getStipendContext(actor: StudentActor) {
  const [profile, assessments, debts, rules] = await Promise.all([
    profileOf(actor),
    getDb().assessment.findMany({
      where: { studentId: actor.studentId },
      select: { semester: true, grade: true, date: true },
    }),
    // Все задолженности, в том числе ликвидированные: для даты прекращения выплаты (N-21).
    getDb().academicDebt.findMany({
      where: { studentId: actor.studentId },
      select: { formedAt: true, status: true },
    }),
    getRulesForStudent(actor),
  ]);
  if (!profile) return null;
  return {
    student: { studyForm: profile.studyForm, funding: profile.funding },
    assessments,
    debts: debts.map((d) => ({
      formedAt: d.formedAt.toISOString().slice(0, 10),
      open: d.status === "OPEN",
    })),
    rules,
  };
}

/** S3a: дисциплина по id оценки студента. Чужая или несуществующая — null. */
export async function getDisciplineView(actor: StudentActor, id: string) {
  if (!idSchema.safeParse(id).success) return null;
  const db = getDb();
  const assessment = await db.assessment.findFirst({
    where: { id, studentId: actor.studentId },
    select: assessmentSelect,
  });
  if (!assessment) return null;
  const [profile, bands, rules, calendar, debt, attempts, retakes] = await Promise.all([
    profileOf(actor),
    bandsFor(actor),
    getRulesForStudent(actor),
    loadCalendar(db),
    db.academicDebt.findFirst({
      where: {
        studentId: actor.studentId,
        disciplineId: assessment.disciplineId,
        status: "OPEN",
      },
      select: { formedAt: true, stage: true, deadline: true },
    }),
    db.assessment.count({
      where: {
        studentId: actor.studentId,
        disciplineId: assessment.disciplineId,
        attempt: { gte: 1 },
        grade: { not: null },
      },
    }),
    db.scheduleEvent.findMany({
      where: {
        studentId: actor.studentId,
        disciplineId: assessment.disciplineId,
        type: { in: ["RETAKE_1", "RETAKE_2"] },
      },
      select: { id: true, startsAt: true, type: true },
    }),
  ]);
  if (!profile) return null;
  // Задолженность относится к этой оценке, если оценка неудовлетворительная.
  const isDebtAssessment =
    debt !== null && (assessment.grade === "UNSATISFACTORY" || assessment.grade === "FAILED");
  return {
    assessment,
    student: { studyForm: profile.studyForm, funding: profile.funding },
    bands,
    rules,
    calendar,
    debt: isDebtAssessment
      ? {
          formedAt: debt.formedAt.toISOString().slice(0, 10),
          stage: debt.stage,
          deadline: debt.deadline.toISOString().slice(0, 10),
          // Допущение прототипа: «итоги учебного года» (N-11) — летняя сессия, июнь–июль.
          afterAnnualSession: ["06", "07"].includes(toDateKey(assessment.date).slice(5, 7)),
        }
      : null,
    attemptsUsed: attempts,
    retakes: retakes.filter(
      (r): r is RetakeInput => r.type === "RETAKE_1" || r.type === "RETAKE_2",
    ),
  };
}

/** Правило о неизменном расписании пересдачи (N-15) для подписи у пересдачи в расписании. */
export async function getRetakeRule(
  actor: StudentActor,
): Promise<{ text: string; norms: { code: string; label: string }[] } | null> {
  const rule = (await getRulesForStudent(actor)).find(
    (r) => r.trigger === "RETAKE_SCHEDULE_LOCKED",
  );
  if (!rule) return null;
  const norms = await listNorms(actor, rule.normCodes);
  return {
    text: rule.body,
    norms: rule.normCodes.map((code) => {
      const norm = norms.find((n) => n.code === code);
      return { code, label: norm ? normLabel(norm) : code };
    }),
  };
}
