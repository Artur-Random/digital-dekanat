import "server-only";

import { z } from "zod";

import type { NotificationType } from "@/generated/prisma/client";
import type { StaffActor } from "@/server/auth/guards";
import { getDb } from "@/server/db";
import { parseStages, statusTitle } from "@/server/rules/application-stages";
import { applicationStatusNotice, retakeScheduleNotice } from "@/server/rules/notices";
import { isRetake, scheduleLink } from "@/server/rules/schedule";
import { ScheduleDomainError } from "@/server/rules/schedule-change";
import { toDateKey } from "@/lib/moscow-date";

import { type DbTx, inTransaction } from "./client";
import { loadEventInTx } from "./schedule";
import { requireDekanat } from "./staff-unit";

// Получатель — всегда пользователь из сессии (actor.userId). Чужое и несуществующее уведомление
// обрабатываются одинаково: ничего не меняется, ответ тот же.

type Reader = { userId: string };

const idSchema = z.cuid();

export async function listNotifications(actor: Reader) {
  return getDb().notification.findMany({
    where: { recipientId: actor.userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      link: true,
      isRead: true,
      createdAt: true,
    },
  });
}

export async function countUnreadNotifications(actor: Reader): Promise<number> {
  return getDb().notification.count({ where: { recipientId: actor.userId, isRead: false } });
}

/** Отметить прочитанным. Возвращает ссылку уведомления, только если оно принадлежит actor. */
export async function markNotificationRead(actor: Reader, id: string): Promise<string | null> {
  if (!idSchema.safeParse(id).success) return null;
  const db = getDb();
  await db.notification.updateMany({
    where: { id, recipientId: actor.userId },
    data: { isRead: true },
  });
  const row = await db.notification.findFirst({
    where: { id, recipientId: actor.userId },
    select: { link: true },
  });
  return row?.link ?? null;
}

export async function markAllNotificationsRead(actor: Reader): Promise<void> {
  await getDb().notification.updateMany({
    where: { recipientId: actor.userId, isRead: false },
    data: { isRead: true },
  });
}

type WriteOptions = { now?: Date; tx?: DbTx };

/** Объявление деканата для групп (E4). Группы — коды, проверяются по базе. */
export async function createAnnouncement(
  actor: StaffActor,
  input: { groupCodes: string[]; title: string; body: string },
  options: WriteOptions = {},
): Promise<number> {
  return inTransaction(options.tx, async (tx) => {
    await requireDekanat(tx, actor);
    const students = await tx.studentProfile.findMany({
      where: { group: { code: { in: input.groupCodes } } },
      select: { userId: true },
    });
    return insert(
      tx,
      students.map((s) => s.userId),
      {
        type: "ANNOUNCEMENT",
        title: input.title,
        body: input.body,
        link: null,
        createdAt: options.now,
      },
    );
  });
}

/** Уведомление о публикации расписания пересдач (N-14) владельцу пересдачи. */
export async function notifyRetakeSchedulePublished(
  actor: StaffActor,
  eventId: string,
  options: WriteOptions = {},
): Promise<number> {
  return inTransaction(options.tx, async (tx) => {
    await requireDekanat(tx, actor);
    const event = await loadEventInTx(tx, eventId);
    if (!event || !isRetake(event.input.type) || !event.studentUserId) {
      throw new ScheduleDomainError("NOT_FOUND", "Пересдача не найдена.");
    }
    const e = event.input;
    // Текст правила для уровня образования владельца пересдачи.
    const owner = await tx.studentProfile.findFirst({
      where: { userId: event.studentUserId },
      select: { levelId: true },
    });
    const locked = await tx.rule.findFirst({
      where: {
        trigger: "RETAKE_SCHEDULE_LOCKED",
        levels: { some: { id: owner?.levelId ?? "" } },
      },
      select: { body: true, normCodes: true },
    });
    const notice = retakeScheduleNotice(
      {
        discipline: e.discipline,
        startsAt: e.startsAt,
        stage: e.type === "RETAKE_1" ? "I" : "II",
        place: e.format === "ONLINE" ? (e.platform ?? "дистанционно") : `ауд. ${e.room ?? "—"}`,
      },
      locked,
    );
    return insert(tx, [event.studentUserId], {
      type: "RETAKE",
      ...notice,
      link: scheduleLink(toDateKey(e.startsAt), e.id),
      createdAt: options.now,
    });
  });
}

/** Уведомление студенту о смене статуса заявки. Только заявки подразделения сотрудника. */
export async function notifyApplicationStatus(
  actor: StaffActor,
  applicationId: string,
  options: WriteOptions = {},
): Promise<number> {
  return inTransaction(options.tx, async (tx) => {
    // Плоские запросы по одному: в транзакции одно соединение (см. loadEventInTx).
    const row = await tx.application.findFirst({
      where: { id: applicationId, unitId: actor.unitId },
      select: { id: true, status: true, branch: true, unitId: true, typeId: true, studentId: true },
    });
    const app = row
      ? {
          ...row,
          unit: await tx.unit.findUniqueOrThrow({
            where: { id: row.unitId },
            select: { name: true },
          }),
          type: await tx.applicationType.findUniqueOrThrow({
            where: { id: row.typeId },
            select: { code: true, title: true, stages: true },
          }),
          student: await tx.studentProfile.findUniqueOrThrow({
            where: { id: row.studentId },
            select: { userId: true },
          }),
        }
      : null;
    if (!app) throw new ScheduleDomainError("NOT_FOUND", "Заявка не найдена.");
    const notice = applicationStatusNotice({
      typeCode: app.type.code,
      title: app.type.title,
      status: app.status,
      statusTitle: statusTitle(parseStages(app.type.stages), app.status, app.branch),
      unitName: app.unit.name,
    });
    return insert(tx, [app.student.userId], {
      type: "APPLICATION_STATUS",
      ...notice,
      link: `/applications/${app.id}`,
      createdAt: options.now,
    });
  });
}

async function insert(
  tx: DbTx,
  recipients: string[],
  data: {
    type: NotificationType;
    title: string;
    body: string;
    link: string | null;
    createdAt?: Date;
  },
): Promise<number> {
  if (recipients.length === 0) return 0;
  const result = await tx.notification.createMany({
    data: recipients.map((recipientId) => ({ recipientId, ...data })),
  });
  return result.count;
}
