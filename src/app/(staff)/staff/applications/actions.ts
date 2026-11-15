"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { FormState } from "@/lib/form-state";
import { requireStaff } from "@/server/auth/guards";
import { changeApplicationStatus } from "@/server/dal/applications";

const inputSchema = z.object({
  id: z.cuid(),
  to: z.enum([
    "IN_PROGRESS",
    "READY",
    "UNDER_REVIEW",
    "SENT_TO_COMMISSION",
    "APPROVED",
    "REJECTED",
    "ORDER_SIGNED",
  ]),
  comment: z.string().max(1000, "Комментарий не длиннее 1000 символов.").default(""),
});

const MESSAGES = {
  NOT_FOUND: "Заявка не найдена.",
  NOT_ALLOWED: "Этот переход сейчас недоступен. Обновите страницу.",
  CONFLICT: "Статус заявки уже изменился. Обновите страницу.",
} as const;

/** E2: сменить статус заявки. Подразделение — только из сессии; переход проверяет DAL. */
export async function changeStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireStaff();
  const comment = formData.get("comment");
  const parsed = inputSchema.safeParse({
    id: formData.get("id"),
    to: formData.get("to"),
    comment: typeof comment === "string" ? comment : "",
  });
  const values = { comment: typeof comment === "string" ? comment : "" };
  if (!parsed.success) {
    const tooLong = parsed.error.issues.find((i) => i.path[0] === "comment");
    return tooLong
      ? { errors: { comment: tooLong.message }, values }
      : { message: MESSAGES.NOT_ALLOWED, values };
  }
  const result = await changeApplicationStatus(actor, parsed.data);
  if (!result.ok) {
    if (result.error === "REASON_REQUIRED") {
      return { errors: { comment: "При отказе укажите причину: студент увидит её." }, values };
    }
    return { message: MESSAGES[result.error], values };
  }
  revalidatePath("/staff", "layout");
  redirect(`/staff/applications/${parsed.data.id}?changed=1`);
}
