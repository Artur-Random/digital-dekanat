import { describe, expect, it } from "vitest";

import { moscowDateTime } from "@/lib/moscow-date";
import { HOLIDAYS } from "@/server/dal/demo/holidays";
import { RULES } from "@/server/dal/demo/rules";

import { debtTimeline } from "./debts";
import type { RuleText } from "./rule-text";
import { whatIfScenarios } from "./what-if";
import { buildCalendar } from "./working-days";

const calendar = buildCalendar(HOLIDAYS);
const rules: RuleText[] = RULES.map((r) => ({
  trigger: r.trigger,
  body: r.body,
  normCodes: r.normCodes,
  stipendOnly: r.stipendOnly,
}));
const budget = { studyForm: "FULL_TIME" as const, funding: "BUDGET" as const };
const contract = { studyForm: "FULL_TIME" as const, funding: "CONTRACT" as const };
const now = moscowDateTime("2026-11-22", "12:00");

function current(date: string) {
  return { controlForm: "EXAM" as const, grade: null, date: moscowDateTime(date, "09:00") };
}

const allText = (s: ReturnType<typeof whatIfScenarios>) =>
  s.flatMap((x) => x.items.map((i) => i.text)).join(" ");

describe("whatIfScenarios", () => {
  it("дисциплина текущего семестра у бюджетника: тройка, неявка, уважительная причина", () => {
    const s = whatIfScenarios({
      now,
      calendar,
      student: budget,
      discipline: "Общая психология",
      assessment: current("2027-01-12"),
      debt: null,
      rules,
    });
    expect(s.map((x) => x.id)).toEqual(["satisfactory", "no-show", "valid-reason"]);
    expect(allText(s)).toContain("перестанет выплачиваться с 1 февраля 2027");
    expect(allText(s)).toContain("ликвидировать до 12 января 2028");
  });

  it("у контрактника нет стипендийных сценариев и текстов", () => {
    const s = whatIfScenarios({
      now,
      calendar,
      student: contract,
      discipline: "Методология",
      assessment: current("2027-01-12"),
      debt: null,
      rules,
    });
    expect(s.map((x) => x.id)).toEqual(["no-show", "valid-reason"]);
    expect(allText(s)).not.toMatch(/стипенди/);
  });

  it("N-04: 3 рабочих дня ПОСЛЕ даты контроля с учётом выходных и праздников", () => {
    // Пятница 27.11.2026 → пн 30.11, вт 1.12, ср 2.12.
    const fri = whatIfScenarios({
      now,
      calendar,
      student: contract,
      discipline: "X",
      assessment: current("2026-11-27"),
      debt: null,
      rules,
    });
    expect(allText(fri)).toContain("до 2 декабря 2026");
    // Среда 30.12.2026: 31.12 и январские каникулы нерабочие → 11, 12, 13 января.
    const ny = whatIfScenarios({
      now,
      calendar,
      student: contract,
      discipline: "X",
      assessment: current("2026-12-30"),
      debt: null,
      rules,
    });
    expect(allText(ny)).toContain("до 13 января 2027");
  });

  it("тексты берутся из Rule, а не из кода", () => {
    const custom: RuleText[] = [
      { trigger: "NO_SHOW", body: "МАРКЕР {deadline}", normCodes: ["N-08"], stipendOnly: false },
    ];
    const s = whatIfScenarios({
      now,
      calendar,
      student: contract,
      discipline: "X",
      assessment: current("2027-01-12"),
      debt: null,
      rules: custom,
    });
    expect(allText(s)).toBe("МАРКЕР 12 января 2028");
  });

  it("задолженность этапа I у бюджетника: этап, стипендия с 1 июля, условный перевод, срок, что делать", () => {
    const retake = {
      id: "r1",
      startsAt: moscowDateTime("2026-12-01", "17:10"),
      type: "RETAKE_1" as const,
    };
    const timeline = debtTimeline({ formedAt: "2026-06-15", stage: "STAGE_1" }, 0, now, [retake]);
    const s = whatIfScenarios({
      now,
      calendar,
      student: budget,
      discipline: "Анатомия",
      assessment: {
        controlForm: "EXAM",
        grade: "UNSATISFACTORY",
        date: moscowDateTime("2026-06-15", "10:00"),
      },
      debt: { formedAt: "2026-06-15", afterAnnualSession: true, timeline },
      rules,
    });
    expect(s.map((x) => x.id)).toEqual(["now", "next", "know", "do"]);
    const text = allText(s);
    expect(text).toContain("впереди попытка 1 из 2");
    expect(text).toContain("не выплачивается с 1 июля 2026");
    expect(text).toContain("переведены условно");
    expect(text).toContain("до 15 июня 2027");
    // Пересдача во вторник 1.12 → сообщить до пятницы 4.12.
    expect(text).toContain("до 4 декабря 2026");
    expect(s.find((x) => x.id === "do")?.actions.map((a) => a.label)).toEqual([
      "Пересдача в расписании",
      "Не смогу прийти",
    ]);
    // Академический отпуск (N-49) — только на этапе II.
    expect(s.flatMap((x) => x.items.map((i) => i.trigger))).not.toContain("ACADEMIC_LEAVE_NO_STAY");
  });

  it("у каждого правила есть нормы реестра, у стипендийных — N-20/N-21/N-23/N-29", () => {
    for (const r of RULES) {
      expect(r.normCodes.length, r.trigger).toBeGreaterThan(0);
      expect(r.levels).toEqual(["BACHELOR", "MASTER", "SPECIALIZED_MASTER"]);
      expect(r.verified).toBe(false);
    }
  });
});
