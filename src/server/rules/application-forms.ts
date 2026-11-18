// Проверка данных мастера заявок (S4a, S5). Чистые функции без доступа к данным:
// сервер разбирает FormData этими схемами и только потом пишет в базу.

import { z } from "zod";

import { type DateKey, isDateKey } from "@/lib/moscow-date";

import { formatDateKeyWithYear } from "@/lib/format-date";

import { formDateBounds, isWithin } from "./academic-year";
import { ABSENCE_NOTICE_WORKING_DAYS } from "./what-if";
import { type ProductionCalendar, addWorkingDays } from "./working-days";

export type FieldErrors = Record<string, string>;
export type FormResult<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors };

function collect(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}

// Неотмеченный чекбокс в FormData не приходит вовсе: ключ необязательный.
const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal(""), z.null()])
  .optional()
  .transform((v) => v === "on" || v === "true");

// --- Справки МФЦ -------------------------------------------------------------------------

const certificateSchema = z.object({
  destination: z
    .string({ error: "Укажите, куда нужна справка." })
    .trim()
    .min(1, "Укажите, куда нужна справка.")
    .max(200, "Не больше 200 символов."),
  // Ограничение формы прототипа, а не норма.
  copies: z.coerce
    .number({ error: "Укажите количество экземпляров." })
    .int("Целое число.")
    .min(1, "От 1 до 5 экземпляров.")
    .max(5, "От 1 до 5 экземпляров."),
});

export type CertificateForm = z.infer<typeof certificateSchema>;

export function parseCertificateForm(input: Record<string, unknown>): FormResult<CertificateForm> {
  const r = certificateSchema.safeParse(input);
  return r.success ? { ok: true, data: r.data } : { ok: false, errors: collect(r.error) };
}

// --- Академический отпуск ----------------------------------------------------------------

/** Основания по N-40 (754общ, п. 2.1). */
export const LEAVE_BASES = ["MILITARY", "MEDICAL", "DISASTER", "FAMILY", "OTHER"] as const;
export type LeaveBasis = (typeof LEAVE_BASES)[number];

export const LEAVE_BASIS_LABEL: Record<LeaveBasis, string> = {
  MILITARY: "Военная служба (призыв или контракт)",
  MEDICAL: "Медицинские показания",
  DISASTER: "Стихийное бедствие",
  FAMILY: "Семейные обстоятельства",
  OTHER: "Иной исключительный случай",
};

/** Военная служба и медицинские показания: решение ректора (N-43), отпуск до 2 лет (N-41). */
function isRectorBasis(basis: LeaveBasis): boolean {
  return basis === "MILITARY" || basis === "MEDICAL";
}

/**
 * Ветка этапов: А — решение ректора (N-43), если основание военная служба или медицинские
 * показания и документы есть; иначе Б — через комиссию (N-44).
 */
export function leaveBranch(basis: LeaveBasis, hasDocuments: boolean): "A" | "B" {
  return isRectorBasis(basis) && hasDocuments ? "A" : "B";
}

/** Наибольший срок в месяцах (N-41): 24 для военной службы и медицинских показаний, иначе 12. */
export function maxLeaveMonths(basis: LeaveBasis): number {
  return isRectorBasis(basis) ? 24 : 12;
}

const leaveSchema = z
  .object({
    basis: z.enum(LEAVE_BASES, { error: "Выберите основание." }),
    hasDocuments: checkbox,
    months: z
      .string({ error: "Укажите срок в месяцах." })
      .trim()
      .min(1, "Укажите срок в месяцах.")
      .transform(Number)
      .pipe(z.number().int("Целое число месяцев.").min(1, "Не меньше 1 месяца.")),
  })
  .superRefine((v, ctx) => {
    const max = maxLeaveMonths(v.basis);
    if (v.months > max) {
      ctx.addIssue({
        code: "custom",
        path: ["months"],
        message: `По этому основанию не больше ${max} месяцев.`,
      });
    }
  });

export type LeaveForm = z.infer<typeof leaveSchema> & { branch: "A" | "B" };

export function parseLeaveForm(input: Record<string, unknown>): FormResult<LeaveForm> {
  const r = leaveSchema.safeParse(input);
  if (!r.success) return { ok: false, errors: collect(r.error) };
  return { ok: true, data: { ...r.data, branch: leaveBranch(r.data.basis, r.data.hasDocuments) } };
}

/**
 * Предупреждение в мастере отпуска (N-49, 754общ п. 2.18): заявление не отменяет отчисление.
 * Показываем, если есть долг на этапе II — после него при несдаче следует отчисление.
 */
export function leaveExpulsionWarning(debts: readonly { stage: "STAGE_1" | "STAGE_2" }[]): boolean {
  return debts.some((d) => d.stage === "STAGE_2");
}

/** Текст ошибки даты вне допустимого периода: с конкретными датами. */
export function dateRangeError(bounds: { min: DateKey; max: DateKey }): string {
  return `Укажите дату с ${formatDateKeyWithYear(bounds.min)} по ${formatDateKeyWithYear(bounds.max)}.`;
}

// --- «Не смогу прийти»: продление срока аттестации ---------------------------------------

/** До какой даты включительно можно сообщить о неявке на контроль в день controlDay. */
export function absenceNoticeDeadline(controlDay: DateKey, calendar: ProductionCalendar): DateKey {
  return addWorkingDays(controlDay, ABSENCE_NOTICE_WORKING_DAYS, calendar);
}

const dateKey = (message: string) =>
  z
    .string({ error: message })
    .refine((v) => isDateKey(v), message)
    .transform((v) => v as DateKey);

const absenceSchema = z
  .object({
    eventId: z.cuid({ error: "Выберите экзамен или пересдачу." }),
    reason: z.string({ error: "Выберите причину." }).regex(/^[A-Z_]{2,32}$/, "Выберите причину."),
    absenceFrom: dateKey("Укажите первый день отсутствия."),
    absenceTo: dateKey("Укажите последний день отсутствия."),
    willBringOriginal: checkbox,
  })
  .superRefine((v, ctx) => {
    if (v.absenceFrom > v.absenceTo) {
      ctx.addIssue({
        code: "custom",
        path: ["absenceTo"],
        message: "Последний день не может быть раньше первого.",
      });
    }
    // N-06: к заявлению прикладывают документ. В прототипе вместо файла — отметка.
    if (!v.willBringOriginal) {
      ctx.addIssue({
        code: "custom",
        path: ["willBringOriginal"],
        message: "Отметьте, что принесёте оригинал документа.",
      });
    }
  });

export type AbsenceForm = z.infer<typeof absenceSchema>;

/**
 * Разбор формы «Не смогу прийти». Контроль, причина и срок проверяются ещё и против данных:
 * controlDay — дата выбранного контроля, reasons — коды причин типа заявки.
 */
export function parseAbsenceForm(
  input: Record<string, unknown>,
  context: {
    controlDay: DateKey | null;
    reasons: readonly string[];
    today: DateKey;
    calendar: ProductionCalendar;
  },
): FormResult<AbsenceForm> {
  const r = absenceSchema.safeParse(input);
  const errors: FieldErrors = r.success ? {} : collect(r.error);
  if (r.success) {
    const v = r.data;
    if (!context.reasons.includes(v.reason)) errors.reason = "Выберите причину.";
    // Границы дат (так устроено в прототипе): без них проходил год 0230.
    const bounds = formDateBounds(context.today);
    const outOfRange = dateRangeError(bounds);
    if (!isWithin(v.absenceFrom, bounds)) errors.absenceFrom = outOfRange;
    if (!isWithin(v.absenceTo, bounds)) errors.absenceTo = outOfRange;
    if (!context.controlDay) {
      errors.eventId = "Выберите экзамен или пересдачу.";
    } else {
      if (context.today > absenceNoticeDeadline(context.controlDay, context.calendar)) {
        errors.eventId = "Срок сообщить о неявке по этому контролю уже прошёл.";
      }
      if (
        !errors.absenceFrom &&
        (context.controlDay < v.absenceFrom || context.controlDay > v.absenceTo)
      ) {
        // Проверка прототипа: без неё заявление о продлении не связано с пропущенным контролем.
        errors.absenceFrom =
          "Дата контроля должна входить в период отсутствия (так устроено в прототипе).";
      }
    }
  }
  if (!r.success || Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: r.data };
}
