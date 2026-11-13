// Академическая задолженность: этап, попытки, крайний срок, ближайшая пересдача.
// N-09: не более двух повторных аттестаций; N-10: в пределах одного календарного года
// с момента образования; N-17: этап I, затем этап II с комиссией.

import type { DebtStage } from "@/generated/prisma/enums";
import { type DateKey, toDateKey } from "@/lib/moscow-date";

export const MAX_ATTEMPTS = 2;

export type DebtInput = {
  formedAt: DateKey;
  stage: DebtStage;
};

export type RetakeInput = { id: string; startsAt: Date; type: "RETAKE_1" | "RETAKE_2" };

export type DebtTimeline = {
  stage: DebtStage;
  /** Использовано повторных попыток (0–2). */
  attemptsUsed: number;
  /** Номер следующей попытки, null — попыток не осталось. */
  nextAttempt: number | null;
  attemptsLeft: number;
  /** Крайний срок ликвидации (N-10). */
  deadline: DateKey;
  overdue: boolean;
  nextRetake: RetakeInput | null;
  /** Что будет после неудачи на текущем этапе. */
  nextStep: "STAGE_2" | "EXPULSION";
};

/** Тот же день через календарный год. 29 февраля → 28 февраля. */
export function addCalendarYear(key: DateKey): DateKey {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  const next = new Date(Date.UTC(y + 1, m - 1, d));
  if (next.getUTCMonth() !== m - 1) next.setUTCDate(0);
  return next.toISOString().slice(0, 10);
}

export function debtTimeline(
  debt: DebtInput,
  attemptsUsed: number,
  now: Date,
  retakes: readonly RetakeInput[],
): DebtTimeline {
  const used = Math.max(0, Math.min(MAX_ATTEMPTS, attemptsUsed));
  // После неудачной первой пересдачи задолженность переходит на этап II (N-17).
  const stage: DebtStage = used >= 1 ? "STAGE_2" : debt.stage;
  const deadline = addCalendarYear(debt.formedAt);
  const nextRetake =
    [...retakes]
      .filter((r) => r.startsAt.getTime() > now.getTime())
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0] ?? null;
  return {
    stage,
    attemptsUsed: used,
    nextAttempt: used < MAX_ATTEMPTS ? used + 1 : null,
    attemptsLeft: MAX_ATTEMPTS - used,
    deadline,
    overdue: toDateKey(now) > deadline,
    nextRetake,
    nextStep: stage === "STAGE_1" ? "STAGE_2" : "EXPULSION",
  };
}
