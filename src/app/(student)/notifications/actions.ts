"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { safeNextPath } from "@/lib/safe-next";
import { requireStudent } from "@/server/auth/guards";
import { markAllNotificationsRead, markNotificationRead } from "@/server/dal/notifications";

const idSchema = z.string().max(64);

/**
 * Открыть уведомление: отметить прочитанным и перейти по его ссылке. Чужое и несуществующее
 * уведомление не меняются, ответ одинаковый: возврат к списку.
 */
export async function openNotification(formData: FormData): Promise<void> {
  const actor = await requireStudent();
  const parsed = idSchema.safeParse(formData.get("id"));
  const link = parsed.success ? await markNotificationRead(actor, parsed.data) : null;
  revalidatePath("/", "layout");
  redirect(safeNextPath(link) ?? "/notifications");
}

export async function markAllRead(): Promise<void> {
  const actor = await requireStudent();
  await markAllNotificationsRead(actor);
  revalidatePath("/", "layout");
  redirect("/notifications");
}
