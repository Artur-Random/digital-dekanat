import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { StaffActor, StudentActor } from "@/server/auth/guards";
import { toDateKey } from "@/lib/moscow-date";
import { getDb } from "@/server/db";
import type { ProductionCalendar } from "@/server/rules/working-days";
import type { ScheduleChangeInput, ScheduleEventInput } from "@/server/rules/schedule";
import { scheduleLink } from "@/server/rules/schedule";
import {
  type ScheduleChangePatch,
  ScheduleDomainError,
  planScheduleChange,
  scheduleChangeNotice,
} from "@/server/rules/schedule-change";

import { loadCalendar } from "./calendar";
import { type DbTx, inTransaction } from "./client";
import { requireDekanat } from "./staff-unit";

// Студент видит события своей группы и свои личные события (пересдачи). groupId и studentId
// берутся из сессии (actor), а не от клиента.

const eventSelect = {
  id: true,
  type: true,
  startsAt: true,
  endsAt: true,
  platform: true,
  format: true,
  discipline: { select: { name: true } },
  teacher: { select: { fullName: true } },
  room: { select: { name: true } },
  changes: {
    select: { field: true, oldValue: true, newValue: true, reason: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.ScheduleEventSelect;

type EventRow = Prisma.ScheduleEventGetPayload<{ select: typeof eventSelect }>;

function toInput(rows: EventRow[]): {
  events: ScheduleEventInput[];
  changes: ScheduleChangeInput[];
} {
  const events: ScheduleEventInput[] = [];
  const changes: ScheduleChangeInput[] = [];
  for (const r of rows) {
    events.push({
      id: r.id,
      type: r.type,
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      discipline: r.discipline.name,
      teacher: r.teacher.fullName,
      room: r.room?.name ?? null,
      platform: r.platform,
      format: r.format,
    });
    for (const c of r.changes) changes.push({ eventId: r.id, ...c });
  }
  return { events, changes };
}

export type StudentSchedule = {
  events: ScheduleEventInput[];
  changes: ScheduleChangeInput[];
  calendar: ProductionCalendar;
};

async function studentScope(actor: StudentActor): Promise<Prisma.ScheduleEventWhereInput> {
  const profile = await getDb().studentProfile.findUnique({
    where: { id: actor.studentId },
    select: { groupId: true },
  });
  // Без профиля — пустой результат, а не чужие данные.
  if (!profile) return { id: { in: [] } };
  return { OR: [{ groupId: profile.groupId }, { studentId: actor.studentId }] };
}

/**
 * События студента в промежутке [from, to): начинаются в нём или были перенесены из него
 * (тогда в старом дне показывается строка «перенесена на …»).
 */
export async function listScheduleForStudent(
  actor: StudentActor,
  from: Date,
  to: Date,
): Promise<StudentSchedule> {
  const db = getDb();
  const scope = await studentScope(actor);
  const [rows, calendar] = await Promise.all([
    db.scheduleEvent.findMany({
      where: {
        AND: [
          scope,
          {
            OR: [
              { startsAt: { gte: from, lt: to } },
              {
                changes: {
                  some: {
                    field: "START_TIME",
                    oldValue: { gte: from.toISOString(), lt: to.toISOString() },
                  },
                },
              },
            ],
          },
        ],
      },
      orderBy: { startsAt: "asc" },
      select: eventSelect,
    }),
    loadCalendar(db),
  ]);
  return { ...toInput(rows), calendar };
}

export type ScheduleChangeResult = { changeCount: number; notified: number };

/**
 * Изменение пары сотрудником деканата: запись «было → стало» и уведомления всем затронутым
 * студентам в одной транзакции. Правила (N-15, сетка звонков) — в rules/schedule-change.
 * Чужое подразделение или несуществующее событие дают одинаковую ошибку «не найдено».
 */
export async function applyScheduleChange(
  actor: StaffActor,
  input: {
    eventId: string;
    patch: Omit<ScheduleChangePatch, "room" | "teacher"> & { roomId?: string; teacherId?: string };
    reason: string;
  },
  options: { now?: Date; tx?: DbTx } = {},
): Promise<ScheduleChangeResult> {
  const now = options.now ?? new Date();
  return inTransaction(options.tx, async (tx) => {
    await requireDekanat(tx, actor);
    const event = await tx.scheduleEvent.findUnique({
      where: { id: input.eventId },
      select: {
        ...eventSelect,
        groupId: true,
        student: { select: { userId: true } },
      },
    });
    if (!event) throw new ScheduleDomainError("NOT_FOUND", "Пара не найдена.");

    // Внутри транзакции запросы идут по одному: одно соединение не выполняет их параллельно.
    const room = input.patch.roomId
      ? await tx.room.findUnique({
          where: { id: input.patch.roomId },
          select: { id: true, name: true },
        })
      : null;
    const teacher = input.patch.teacherId
      ? await tx.teacher.findUnique({
          where: { id: input.patch.teacherId },
          select: { id: true, fullName: true },
        })
      : null;
    const calendar = await loadCalendar(tx);
    if ((input.patch.roomId && !room) || (input.patch.teacherId && !teacher)) {
      throw new ScheduleDomainError("NOT_FOUND", "Аудитория или преподаватель не найдены.");
    }

    const { events, changes } = toInput([event]);
    const snapshot = events[0];
    if (!snapshot) throw new ScheduleDomainError("NOT_FOUND", "Пара не найдена.");
    const cancelled = changes.some((c) => c.field === "CANCELLED" && c.newValue === "true");
    const plan = planScheduleChange(
      { ...snapshot, cancelled },
      {
        date: input.patch.date,
        pair: input.patch.pair,
        format: input.patch.format,
        cancel: input.patch.cancel,
        room: room ?? undefined,
        teacher: teacher ? { id: teacher.id, name: teacher.fullName } : undefined,
      },
      calendar,
    );

    const updated = await tx.scheduleEvent.update({
      where: { id: event.id },
      data: plan.update,
      select: { startsAt: true },
    });
    await tx.scheduleChange.createMany({
      data: plan.fields.map((f) => ({
        eventId: event.id,
        field: f.field,
        oldValue: f.oldValue,
        newValue: f.newValue,
        reason: input.reason,
        changedById: actor.staffId,
        createdAt: now,
      })),
    });

    // Затронутые студенты: вся группа или владелец личного события.
    const recipients = event.groupId
      ? (
          await tx.studentProfile.findMany({
            where: { groupId: event.groupId },
            select: { userId: true },
          })
        ).map((s) => s.userId)
      : event.student
        ? [event.student.userId]
        : [];
    const notice = scheduleChangeNotice(snapshot, plan.fields, input.reason);
    const link = scheduleLink(toDateKey(updated.startsAt), event.id);
    if (recipients.length > 0) {
      await tx.notification.createMany({
        data: recipients.map((recipientId) => ({
          recipientId,
          type: "SCHEDULE_CHANGE" as const,
          title: notice.title,
          body: notice.body,
          link,
          createdAt: now,
        })),
      });
    }
    return { changeCount: plan.fields.length, notified: recipients.length };
  });
}
