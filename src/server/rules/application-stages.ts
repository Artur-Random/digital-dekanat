// Этапы заявок: схема данных ApplicationType.stages, название статуса для типа заявки,
// срок следующего этапа. Чистые функции, без доступа к данным.

import { z } from "zod";

import type { ApplicationStatus } from "@/generated/prisma/enums";
import { type DateKey, toDateKey } from "@/lib/moscow-date";
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
 * Срок ближайшего этапа ветки со сроком после текущего статуса.
 * submitted — дата подачи, enteredCurrent — дата входа в текущий этап.
 * Этапы без срока (например, «Оформляется») пропускаются: срок справки считается от подачи
 * и виден сразу. Срок «от предыдущего этапа» известен только для следующего этапа.
 * null, если впереди нет этапа с известным сроком.
 */
export function nextStageDeadline(
  branch: StageBranch,
  current: ApplicationStatus,
  dates: { submitted: DateKey; enteredCurrent: DateKey },
  calendar: ProductionCalendar,
): DateKey | null {
  const index = branch.stages.findIndex((s) => s.status === current);
  if (index < 0) return null;
  for (let i = index + 1; i < branch.stages.length; i++) {
    const stage = branch.stages[i];
    if (!stage || stage.deadlineDays === null || stage.countFrom === null) continue;
    if (stage.countFrom === "PREVIOUS" && i !== index + 1) return null;
    const from = stage.countFrom === "SUBMITTED" ? dates.submitted : dates.enteredCurrent;
    return addWorkingDays(from, stage.deadlineDays, calendar);
  }
  return null;
}

/** Заявка закрыта: отказ, отмена или пройден последний этап ветки. */
export function isClosed(branch: StageBranch | undefined, status: ApplicationStatus): boolean {
  if (status === "REJECTED" || status === "CANCELLED") return true;
  return branch?.stages.at(-1)?.status === status;
}

export type Transition = { to: ApplicationStatus; kind: "advance" | "reject" };

/**
 * Допустимые переходы для сотрудника (E2): только в следующий этап ветки, отказ только там,
 * где следующий этап это допускает (canReject). Из закрытой заявки переходов нет.
 */
export function allowedTransitions(
  branch: StageBranch | undefined,
  current: ApplicationStatus,
): Transition[] {
  if (!branch || isClosed(branch, current)) return [];
  const index = branch.stages.findIndex((s) => s.status === current);
  const next = index < 0 ? undefined : branch.stages[index + 1];
  if (!next) return [];
  const result: Transition[] = [{ to: next.status, kind: "advance" }];
  if (next.canReject) result.push({ to: "REJECTED", kind: "reject" });
  return result;
}

/** Студент может отменить заявку только до того, как её взяли в работу (spec, S4b). */
export function canStudentCancel(status: ApplicationStatus): boolean {
  return status === "SUBMITTED";
}

export function findBranch(branches: StageBranch[], code: string): StageBranch | undefined {
  return branches.find((b) => b.code === code);
}

export type TimelineEntry = {
  status: ApplicationStatus;
  title: string;
  state: "done" | "current" | "upcoming";
  /** Когда заявка вошла в этап (из истории). */
  enteredAt: Date | null;
  /** Срок этапа, если его можно посчитать по датам заявки. */
  due: DateKey | null;
  /** Срок словами, если даты ещё нет: рабочих дней и от чего считать. */
  dueDays: { days: number; from: "SUBMITTED" | "PREVIOUS" } | null;
  basis: Stage["basis"];
};

/**
 * Таймлайн этапов для карточки заявки (S4b, E2): пройденные этапы с датами, текущий,
 * впереди — со сроком. Отказ и отмена добавляются последней строкой.
 * Без заявки (events пустые, current null) — описание веток для мастера.
 */
export function stageTimeline(
  branch: StageBranch,
  app: {
    current: ApplicationStatus;
    events: { toStatus: ApplicationStatus; createdAt: Date }[];
    submitted: DateKey;
  } | null,
  calendar: ProductionCalendar,
  closingTitle?: string,
): TimelineEntry[] {
  const enteredAt = (status: ApplicationStatus) =>
    app?.events.filter((e) => e.toStatus === status).at(-1)?.createdAt ?? null;
  const terminal = app && (app.current === "REJECTED" || app.current === "CANCELLED");
  // При отказе и отмене текущий этап — тот, из которого заявку закрыли.
  const reached = terminal
    ? (app.events.filter((e) => e.toStatus !== app.current).at(-1)?.toStatus ?? "SUBMITTED")
    : app?.current;
  const currentIndex = reached ? branch.stages.findIndex((s) => s.status === reached) : -1;

  const entries: TimelineEntry[] = branch.stages.map((stage, i) => {
    const state: TimelineEntry["state"] =
      !app || i > currentIndex ? "upcoming" : i === currentIndex && !terminal ? "current" : "done";
    let due: DateKey | null = null;
    if (app && state === "upcoming" && !terminal && stage.deadlineDays !== null) {
      if (stage.countFrom === "SUBMITTED") {
        due = addWorkingDays(app.submitted, stage.deadlineDays, calendar);
      } else if (stage.countFrom === "PREVIOUS" && i === currentIndex + 1) {
        const prev = branch.stages[currentIndex];
        const entered = prev ? enteredAt(prev.status) : null;
        if (entered) due = addWorkingDays(toDateKey(entered), stage.deadlineDays, calendar);
      }
    }
    return {
      status: stage.status,
      title: stage.title,
      state,
      enteredAt: state === "upcoming" ? null : enteredAt(stage.status),
      due,
      dueDays:
        stage.deadlineDays !== null && stage.countFrom !== null
          ? { days: stage.deadlineDays, from: stage.countFrom }
          : null,
      basis: stage.basis,
    };
  });

  if (app && terminal) {
    // Этапы после точки закрытия не наступят: в таймлайне их нет.
    const kept = entries.slice(0, currentIndex + 1);
    kept.push({
      status: app.current,
      title: closingTitle ?? APPLICATION_STATUS_LABEL[app.current],
      state: "current",
      enteredAt: enteredAt(app.current),
      due: null,
      dueDays: null,
      basis: null,
    });
    return kept;
  }
  return entries;
}
