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
    const event = await tx.scheduleEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        type: true,
        startsAt: true,
        format: true,
        platform: true,
        discipline: { select: { name: true } },
        room: { select: { name: true } },
        student: { select: { userId: true } },
      },
    });
    if (!event || !isRetake(event.type) || !event.student) {
      throw new ScheduleDomainError("NOT_FOUND", "Пересдача не найдена.");
    }
    const notice = retakeScheduleNotice({
      discipline: event.discipline.name,
      startsAt: event.startsAt,
      stage: event.type === "RETAKE_1" ? "I" : "II",
      place:
        event.format === "ONLINE"
          ? (event.platform ?? "дистанционно")
          : `ауд. ${event.room?.name ?? "—"}`,
    });
    return insert(tx, [event.student.userId], {
      type: "RETAKE",
      ...notice,
      link: scheduleLink(toDateKey(event.startsAt), event.id),
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
    const app = await tx.application.findFirst({
      where: { id: applicationId, unitId: actor.unitId },
      select: {
        id: true,
        status: true,
        branch: true,
        unit: { select: { name: true } },
        type: { select: { code: true, title: true, stages: true } },
        student: { select: { userId: true } },
      },
    });
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
