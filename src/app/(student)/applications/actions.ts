"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { formatDayTime } from "@/lib/format-date";
import type { FormState } from "@/lib/form-state";
import { toDateKey } from "@/lib/moscow-date";
import { EVENT_TYPE_LABEL } from "@/lib/schedule-labels";
import { type StudentActor, requireStudent } from "@/server/auth/guards";
import {
  type CreateResult,
  cancelApplication,
  createApplication,
  getAbsenceContext,
  getApplicationLimitView,
  getApplicationTypeForStudent,
} from "@/server/dal/applications";
import {
  parseAbsenceForm,
  parseCertificateForm,
  parseLeaveForm,
} from "@/server/rules/application-forms";

// Тип заявки приходит из формы, но проверяется по базе: доступен ли он уровню студента.
// studentId, подразделение и срок берутся только из сессии и данных типа.

const certificateCode = z.enum(["CERT_ENROLLMENT", "CERT_GRADES", "CERT_SUMMONS"]);

const FAILED: FormState = {
  message: "Не удалось подать заявку. Обновите страницу и попробуйте ещё раз.",
};

function fields(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

/** Ошибки по полям и общее сообщение: его объявит role="alert", фокус уйдёт на первое поле. */
function invalid(errors: Record<string, string>, values: Record<string, string>): FormState {
  return { errors, values, message: "Заявка не отправлена: проверьте отмеченные поля." };
}

/** Итог подачи: переход в карточку или сообщение (лимит проверяется на сервере, в DAL). */
async function result(actor: StudentActor, created: CreateResult): Promise<FormState> {
  if (created.ok) done(created.id);
  if (created.error !== "LIMIT") return FAILED;
  // Текст лимита — правило APPLICATION_LIMIT из таблицы Rule, нормы нет.
  const { text } = await getApplicationLimitView(actor);
  return { message: text, prototypeNote: true };
}

function done(id: string): never {
  revalidatePath("/", "layout");
  redirect(`/applications/${id}?created=1`);
}

export async function submitCertificate(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireStudent();
  const code = certificateCode.safeParse(formData.get("typeCode"));
  if (!code.success) return FAILED;
  const parsed = parseCertificateForm(fields(formData));
  if (!parsed.ok) return invalid(parsed.errors, fields(formData));
  const created = await createApplication(actor, {
    typeCode: code.data,
    branch: "MAIN",
    formData: { destination: parsed.data.destination, copies: parsed.data.copies },
    willBringOriginal: false,
  });
  return result(actor, created);
}

export async function submitAcademicLeave(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireStudent();
  const parsed = parseLeaveForm(fields(formData));
  if (!parsed.ok) return invalid(parsed.errors, fields(formData));
  const created = await createApplication(actor, {
    typeCode: "ACADEMIC_LEAVE",
    branch: parsed.data.branch,
    formData: {
      basis: parsed.data.basis,
      months: parsed.data.months,
      hasDocuments: parsed.data.hasDocuments,
    },
    willBringOriginal: parsed.data.hasDocuments,
  });
  return result(actor, created);
}

export async function submitAbsence(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireStudent();
  const [type, ctx] = await Promise.all([
    getApplicationTypeForStudent(actor, "PA_EXTENSION"),
    getAbsenceContext(actor),
  ]);
  if (!type) return FAILED;
  const input = fields(formData);
  const event = ctx.candidates.find((c) => c.id === input.eventId);
  const parsed = parseAbsenceForm(input, {
    controlDay: event ? toDateKey(event.startsAt) : null,
    reasons: type.requiredDocuments.flatMap((d) => (d.code ? [d.code] : [])),
    today: ctx.today,
    calendar: ctx.calendar,
  });
  if (!parsed.ok || !event) return invalid(parsed.ok ? {} : parsed.errors, input);
  const created = await createApplication(actor, {
    typeCode: "PA_EXTENSION",
    branch: "MAIN",
    formData: {
      eventId: event.id,
      event: `${EVENT_TYPE_LABEL[event.type]}: ${event.discipline}, ${formatDayTime(event.startsAt)}`,
      reason: parsed.data.reason,
      absenceFrom: parsed.data.absenceFrom,
      absenceTo: parsed.data.absenceTo,
    },
    willBringOriginal: parsed.data.willBringOriginal,
  });
  return result(actor, created);
}

const idSchema = z.cuid();

export async function cancelOwnApplication(formData: FormData): Promise<void> {
  const actor = await requireStudent();
  const id = idSchema.safeParse(formData.get("id"));
  if (id.success) await cancelApplication(actor, id.data);
  revalidatePath("/", "layout");
  redirect(id.success ? `/applications/${encodeURIComponent(id.data)}` : "/applications");
}
