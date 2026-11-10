// Этапы заявок: схема данных ApplicationType.stages, название статуса для типа заявки,
// срок следующего этапа. Чистые функции, без доступа к данным.

import { z } from "zod";

import type { ApplicationStatus } from "@/generated/prisma/enums";
import type { DateKey } from "@/lib/moscow-date";
import { APPLICATION_STATUS_LABEL } from "@/lib/labels";

import { type ProductionCalendar, addWorkingDays } from "./working-days";

const statusSchema = z.enum([
  "SUBMITTED",
  "IN_PROGRESS",
  "READY",
  "UNDER_REVIEW",
  "SENT_TO_COMMISSION",
  "APPROVED",
  "REJECTED",
  "ORDER_SIGNED",
  "CANCELLED",
] satisfies [ApplicationStatus, ...ApplicationStatus[]]);

const basisSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("NORM"), code: z.string().regex(/^N-\d+$/) }),
  z.object({ kind: z.literal("PROTOTYPE_ASSUMPTION"), code: z.string().regex(/^X-\d+$/) }),
]);

export const stageSchema = z.object({
  status: statusSchema,
  title: z.string().min(1),
  /** Срок в рабочих днях для перехода в этот этап, null — без срока. */
  deadlineDays: z.number().int().positive().nullable(),
  /** От чего считается срок: от подачи или от входа в предыдущий этап. */
  countFrom: z.enum(["SUBMITTED", "PREVIOUS"]).nullable(),
  /** Код нормы из реестра или допущение прототипа (X-3, X-4). */
  basis: basisSchema.nullable(),
  /** На этом этапе возможен отказ (статус REJECTED). */
  canReject: z.boolean().default(false),
});

export const branchSchema = z.object({
  code: z.string().min(1),
  title: z.string().min(1),
  stages: z.array(stageSchema).min(1),
});

export const stagesSchema = z.array(branchSchema);

export type Stage = z.infer<typeof stageSchema>;
export type StageBranch = z.infer<typeof branchSchema>;

/** Разбор JSON из базы. Неверный формат — ошибка, а не молчаливое значение по умолчанию. */
export function parseStages(json: unknown): StageBranch[] {
  return stagesSchema.parse(json);
}

/**
 * Название статуса для конкретного типа заявки: из этапов типа, иначе общая подпись.
 * Нужно потому, что один статус значит разное: ORDER_SIGNED у продления аттестации —
 * распоряжение (N-05), у академического отпуска — приказ (N-48).
 */
export function statusTitle(
  branches: StageBranch[],
  status: ApplicationStatus,
  branchCode?: string,
): string {
  // Сначала ветка самой заявки: в разных ветках один статус может называться по-разному.
  const ordered = [...branches].sort(
    (a, b) => Number(b.code === branchCode) - Number(a.code === branchCode),
  );
  for (const branch of ordered) {
    const stage = branch.stages.find((s) => s.status === status);
    if (stage) return stage.title;
  }
  return APPLICATION_STATUS_LABEL[status];
}

/**
 * Срок следующего этапа ветки после текущего статуса.
 * submitted — дата подачи, enteredCurrent — дата входа в текущий этап.
 * null, если следующего этапа нет или у него нет срока.
 */
export function nextStageDeadline(
  branch: StageBranch,
  current: ApplicationStatus,
  dates: { submitted: DateKey; enteredCurrent: DateKey },
  calendar: ProductionCalendar,
): DateKey | null {
  const index = branch.stages.findIndex((s) => s.status === current);
  if (index < 0) return null;
  const next = branch.stages[index + 1];
  if (!next || next.deadlineDays === null || next.countFrom === null) return null;
  const from = next.countFrom === "SUBMITTED" ? dates.submitted : dates.enteredCurrent;
  return addWorkingDays(from, next.deadlineDays, calendar);
}
