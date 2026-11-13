// Тесты с базой: сид учёбы и проверки владельца в DAL «Учёбы».

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { toDateKey, weekday } from "@/lib/moscow-date";
import type { StudentActor } from "@/server/auth/guards";
import { disconnectDb, getDb } from "@/server/db";
import { gradeFor } from "@/server/rules/grades";

import { GRADE_BANDS } from "./demo/grade-bands";
import { resetDemoData } from "./demo/reset";
import { getDebts, getDisciplineView, getStipendContext, listAssessments } from "./study";

async function actorOf(login: "alina" | "denis"): Promise<StudentActor> {
  const s = await getDb().studentProfile.findFirstOrThrow({
    where: { user: { login } },
    select: { id: true, userId: true, funding: true, level: { select: { code: true } } },
  });
  return { userId: s.userId, studentId: s.id, levelCode: s.level.code, funding: s.funding };
}

beforeAll(async () => {
  await resetDemoData({ today: "2026-11-22" });
});

afterAll(async () => {
  await resetDemoData();
  await disconnectDb();
});

describe("сид учёбы", () => {
  it("оценка в базе совпадает со шкалой GradeBand уровня (N-03)", async () => {
    const rows = await getDb().assessment.findMany({
      where: { score: { not: null } },
      select: {
        score: true,
        grade: true,
        controlForm: true,
        student: { select: { level: { select: { code: true } } } },
      },
    });
    expect(rows.length).toBe(11);
    for (const r of rows) {
      expect(r.grade).toBe(
        gradeFor(r.score ?? -1, r.controlForm, r.student.level.code, GRADE_BANDS).grade,
      );
    }
  });

  it("задолженность Алины: июнь 2026, этап I, срок 15 июня 2027, одна на дисциплину экзамена", async () => {
    const debts = await getDebts(await actorOf("alina"));
    expect(debts).toHaveLength(1);
    expect(debts[0]).toMatchObject({
      formedAt: "2026-06-15",
      deadline: "2027-06-15",
      stage: "STAGE_1",
    });
    expect(debts[0]?.assessmentId).toBeTruthy();
    expect(await getDebts(await actorOf("denis"))).toEqual([]);
  });

  it("сессия: зачёты Дениса в последнюю учебную неделю декабря, экзамены Алины в январе", async () => {
    const denis = await listAssessments(await actorOf("denis"), 1);
    expect(denis.rows).toHaveLength(4);
    for (const a of denis.rows) {
      const day = toDateKey(a.date);
      expect(day >= "2026-12-28" && day <= "2026-12-30", day).toBe(true);
      expect(a.score).toBeNull();
    }
    const alina = await listAssessments(await actorOf("alina"), 3);
    const exams = alina.rows.filter((a) => a.controlForm === "EXAM").map((a) => toDateKey(a.date));
    expect(exams.every((d) => d.startsWith("2027-01-"))).toBe(true);
    expect(alina.rows.every((a) => [1, 2, 3, 4, 5].includes(weekday(toDateKey(a.date))))).toBe(
      true,
    );
  });

  it("правила: 17 триггеров, у каждого четыре уровня, сверено 15", async () => {
    const rules = await getDb().rule.findMany({
      select: { trigger: true, verified: true, _count: { select: { levels: true } } },
    });
    expect(rules).toHaveLength(17);
    expect(new Set(rules.map((r) => r.trigger)).size).toBe(17);
    expect(rules.every((r) => r._count.levels === 4)).toBe(true);
    expect(rules.filter((r) => r.verified)).toHaveLength(15);
  });

  it("контекст стипендии: у Алины задолженность, у Дениса контракт", async () => {
    const alina = await getStipendContext(await actorOf("alina"));
    expect(alina?.student).toEqual({ studyForm: "FULL_TIME", funding: "BUDGET" });
    expect(alina?.debts).toEqual([{ formedAt: "2026-06-15", open: true }]);
    const denis = await getStipendContext(await actorOf("denis"));
    expect(denis?.student.funding).toBe("CONTRACT");
  });
});

describe("getDisciplineView: только свои оценки", () => {
  it("чужая и несуществующая оценка дают одинаковый null", async () => {
    const alina = await actorOf("alina");
    const denis = await actorOf("denis");
    const denisAssessment = (await listAssessments(denis, 1)).rows[0];
    const alinaDebt = (await getDebts(alina))[0]?.assessmentId ?? "";
    expect(await getDisciplineView(alina, denisAssessment?.id ?? "")).toBeNull();
    expect(await getDisciplineView(denis, alinaDebt)).toBeNull();
    expect(await getDisciplineView(alina, "cmissing0000000000000000")).toBeNull();
    expect(await getDisciplineView(alina, "мусор")).toBeNull();
    const own = await getDisciplineView(alina, alinaDebt);
    expect(own?.debt).toMatchObject({ stage: "STAGE_1", afterAnnualSession: true });
    expect(own?.retakes).toHaveLength(1);
  });
});
