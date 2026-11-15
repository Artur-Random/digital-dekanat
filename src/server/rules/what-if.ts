// «Что будет, если…» (S3a): сценарии по дисциплине. Тексты берутся только из таблицы Rule
// (параметр rules), здесь вычисляются даты и выбирается, какие тексты показать.
// Тексты о стипендии — только для очной формы и бюджета (N-22): у контрактника их нет вовсе.

import type { ControlForm, GradeValue } from "@/generated/prisma/enums";
import { type DateKey, toDateKey } from "@/lib/moscow-date";
import { formatDateKeySmart } from "@/lib/format-date";

import { type DebtTimeline, addCalendarYear } from "./debts";
import { type RuleText, renderRule } from "./rule-text";
import { scheduleLink } from "./schedule";
import { type StipendStudent, firstOfNextMonth, isStipendEligible } from "./stipend";
import { type ProductionCalendar, addWorkingDays } from "./working-days";

export type ScenarioItem = {
  trigger: string;
  text: string;
  normCodes: string[];
  prototypeAssumption: boolean;
};
export type ScenarioAction = { label: string; href: string };
export type Scenario = {
  id: string;
  title: string;
  items: ScenarioItem[];
  actions: ScenarioAction[];
};

export type WhatIfInput = {
  now: Date;
  calendar: ProductionCalendar;
  student: StipendStudent;
  discipline: string;
  /** Результат или ожидаемый контроль текущего семестра. */
  assessment: { controlForm: ControlForm; grade: GradeValue | null; date: Date } | null;
  /** Задолженность и её расчёт (debtTimeline). */
  debt: { formedAt: DateKey; afterAnnualSession: boolean; timeline: DebtTimeline } | null;
  rules: readonly RuleText[];
  /** Обычная стипендия уже прекращена (stipendStatus): сценарий «удовлетворительно» не нужен. */
  stipendStopped: boolean;
};

/** Срок «Не смогу прийти»: 3 рабочих дня ПОСЛЕ даты контроля (N-04, N-16). */
export const ABSENCE_NOTICE_WORKING_DAYS = 3;

const DAYS_TO_NOTIFY = ABSENCE_NOTICE_WORKING_DAYS;

export function whatIfScenarios(input: WhatIfInput): Scenario[] {
  const eligible = isStipendEligible(input.student);
  const today = toDateKey(input.now);
  const date = (key: DateKey) => formatDateKeySmart(key, today);

  function item(trigger: string, vars: Record<string, string> = {}): ScenarioItem[] {
    const rule = input.rules.find((r) => r.trigger === trigger);
    if (!rule || (rule.stipendOnly && !eligible)) return [];
    return [
      {
        trigger,
        text: renderRule(rule.body, vars),
        normCodes: rule.normCodes,
        prototypeAssumption: rule.prototypeAssumption,
      },
    ];
  }

  const scenarios: Scenario[] = [];
  const push = (s: Scenario) => {
    if (s.items.length > 0) scenarios.push(s);
  };

  if (input.debt) {
    const { timeline, formedAt } = input.debt;
    const retake = timeline.nextRetake;
    push({
      id: "now",
      title: "Что сейчас",
      items: [
        ...(timeline.stage === "STAGE_1"
          ? item("DEBT_STAGE_1", { discipline: input.discipline })
          : item("DEBT_STAGE_2")),
        ...(retake ? [] : item("RETAKE_SCHEDULE_PUBLISH")),
        ...item("STIPEND_STOPPED", {
          stopDate: date(firstOfNextMonth(formedAt)),
          reason: "академическая задолженность",
        }),
        ...item("STIPEND_AFTER_LIQUIDATION"),
        ...(input.debt.afterAnnualSession ? item("CONDITIONAL_TRANSFER") : []),
      ],
      actions: [],
    });
    push({
      id: "next",
      title: "Что будет дальше",
      items: [
        ...(timeline.stage === "STAGE_1" ? item("DEBT_STAGE_2") : []),
        ...item("DEBT_NOT_LIQUIDATED", { deadline: date(timeline.deadline) }),
        ...(timeline.stage === "STAGE_2" ? item("ACADEMIC_LEAVE_NO_STAY") : []),
      ],
      actions: [],
    });
    push({
      id: "know",
      title: "Что важно знать",
      items: [
        ...item("RETAKE_FREE"),
        ...item("RETAKE_SCHEDULE_LOCKED"),
        ...item("RETAKE_RAISED_STIPEND"),
      ],
      actions: [],
    });
    if (retake) {
      const day = toDateKey(retake.startsAt);
      push({
        id: "do",
        title: "Что делать",
        items: item("ABSENCE_NOTICE", {
          notifyBy: date(addWorkingDays(day, DAYS_TO_NOTIFY, input.calendar)),
        }),
        actions: [
          { label: "Пересдача в расписании", href: scheduleLink(day, retake.id) },
          { label: "Не смогу прийти", href: `/cant-attend?event=${retake.id}` },
        ],
      });
    }
    return scenarios;
  }

  const a = input.assessment;
  if (!a || a.grade !== null) return scenarios;
  const controlDay = toDateKey(a.date);
  // У зачёта нет оценки «удовлетворительно» (N-03): сценарий только для экзамена и дифзачёта.
  // О возобновлении выплаты нормы в реестре нет: если стипендия уже прекращена, говорим только
  // о требовании к назначению (N-20), а не о повторном прекращении (N-21).
  if (a.controlForm !== "CREDIT") {
    push({
      id: "satisfactory",
      title: "Если получу «удовлетворительно»",
      items: input.stipendStopped
        ? item("GRADE_SATISFACTORY_ASSIGNMENT")
        : item("GRADE_SATISFACTORY", { stopDate: date(firstOfNextMonth(controlDay)) }),
      actions: [],
    });
  }
  push({
    id: "no-show",
    title: "Если не приду без уважительной причины",
    items: item("NO_SHOW", { deadline: date(addCalendarYear(controlDay)) }),
    actions: [],
  });
  push({
    id: "valid-reason",
    title: "Если не смогу прийти по уважительной причине",
    items: item("ABSENCE_NOTICE", {
      notifyBy: date(addWorkingDays(controlDay, DAYS_TO_NOTIFY, input.calendar)),
    }),
    actions: [{ label: "Не смогу прийти", href: "/cant-attend" }],
  });
  return scenarios;
}
