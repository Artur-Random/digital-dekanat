// Изменение расписания: проверка и план записи «было → стало». Чистые функции.
// Пересдача (N-15): дату и время менять нельзя, допускается только замена преподавателя
// и формат проведения.

import type { DeliveryFormat, ScheduleChangeField } from "@/generated/prisma/enums";
import { type DateKey, moscowDateTime, moscowTime, toDateKey } from "@/lib/moscow-date";
import { formatSlot } from "@/lib/format-date";

import { bellByPair, pairOf } from "./bells";
import { isRetake, type ScheduleEventInput } from "./schedule";
import { type ProductionCalendar, isWorkingDay } from "./working-days";

export type ScheduleChangePatch = {
  /** Новый день; без pair пара остаётся той же. */
  date?: DateKey;
  /** Новый номер пары по сетке звонков. */
  pair?: number;
  /** Аудитория и преподаватель: id для записи и имя для истории «было → стало». */
  room?: { id: string; name: string };
  teacher?: { id: string; name: string };
  format?: DeliveryFormat;
  cancel?: boolean;
};

export type ScheduleDomainErrorCode =
  | "RETAKE_LOCKED"
  | "OFF_GRID"
  | "NOT_STUDY_DAY"
  | "ALREADY_CANCELLED"
  | "NOTHING_TO_CHANGE"
  /** Нет такой пары или она не в ведении сотрудника: одинаково для обоих случаев. */
  | "NOT_FOUND";

/** Ошибка домена: изменение запрещено правилами, а не сбой. Текст можно показывать. */
export class ScheduleDomainError extends Error {
  constructor(
    readonly code: ScheduleDomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ScheduleDomainError";
  }
}

export type PlannedField = { field: ScheduleChangeField; oldValue: string; newValue: string };

export type ScheduleChangePlan = {
  fields: PlannedField[];
  /** Новое состояние события. */
  update: {
    startsAt?: Date;
    endsAt?: Date;
    roomId?: string;
    teacherId?: string;
    format?: DeliveryFormat;
  };
};

export const FORMAT_LABEL: Record<DeliveryFormat, string> = {
  OFFLINE: "очно",
  ONLINE: "дистанционно",
};

export function planScheduleChange(
  event: ScheduleEventInput & { cancelled: boolean },
  patch: ScheduleChangePatch,
  calendar: ProductionCalendar,
): ScheduleChangePlan {
  const movesTime = patch.date !== undefined || patch.pair !== undefined;
  if (isRetake(event.type) && (movesTime || patch.cancel)) {
    throw new ScheduleDomainError(
      "RETAKE_LOCKED",
      "Дату и время пересдачи менять нельзя (N-15): допускается только замена преподавателя и формат проведения.",
    );
  }
  if (event.cancelled) {
    throw new ScheduleDomainError("ALREADY_CANCELLED", "Пара уже отменена.");
  }

  const fields: PlannedField[] = [];
  const update: ScheduleChangePlan["update"] = {};

  if (patch.cancel) {
    fields.push({ field: "CANCELLED", oldValue: "false", newValue: "true" });
  }

  if (movesTime) {
    const currentPair = pairOf(moscowTime(event.startsAt), moscowTime(event.endsAt));
    const pair = patch.pair ?? currentPair;
    if (pair === null) {
      throw new ScheduleDomainError("OFF_GRID", "Время пары не совпадает с сеткой звонков.");
    }
    const date = patch.date ?? toDateKey(event.startsAt);
    if (!isWorkingDay(date, calendar)) {
      throw new ScheduleDomainError("NOT_STUDY_DAY", "Перенос возможен только на учебный день.");
    }
    const bell = bellByPair(pair);
    const startsAt = moscowDateTime(date, bell.start);
    if (startsAt.getTime() !== event.startsAt.getTime()) {
      fields.push({
        field: "START_TIME",
        oldValue: event.startsAt.toISOString(),
        newValue: startsAt.toISOString(),
      });
      update.startsAt = startsAt;
      update.endsAt = moscowDateTime(date, bell.end);
    }
  }

  if (patch.room !== undefined && patch.room.name !== (event.room ?? "")) {
    fields.push({ field: "ROOM", oldValue: event.room ?? "", newValue: patch.room.name });
    update.roomId = patch.room.id;
  }
  if (patch.teacher !== undefined && patch.teacher.name !== event.teacher) {
    fields.push({ field: "TEACHER", oldValue: event.teacher, newValue: patch.teacher.name });
    update.teacherId = patch.teacher.id;
  }
  if (patch.format !== undefined && patch.format !== event.format) {
    fields.push({ field: "FORMAT", oldValue: event.format, newValue: patch.format });
    update.format = patch.format;
  }

  if (fields.length === 0) {
    throw new ScheduleDomainError("NOTHING_TO_CHANGE", "Изменений нет.");
  }
  return { fields, update };
}

/** Строка «было → стало» для одного поля: в уведомлении и в расписании. */
export function describeField(field: ScheduleChangeField, from: string, to: string): string {
  switch (field) {
    case "CANCELLED":
      return "Пара отменена";
    case "START_TIME": {
      const f = new Date(from);
      const t = new Date(to);
      const slot = (d: Date) => ({
        date: toDateKey(d),
        pair: pairOf(moscowTime(d)),
        start: moscowTime(d),
      });
      return `Перенос: ${formatSlot(slot(f))} → ${formatSlot(slot(t))}`;
    }
    case "ROOM":
      return `Аудитория: ${from || "не указана"} → ${to}`;
    case "TEACHER":
      return `Преподаватель: ${from} → ${to}`;
    case "FORMAT":
      return `Формат: ${FORMAT_LABEL[from as DeliveryFormat] ?? from} → ${FORMAT_LABEL[to as DeliveryFormat] ?? to}`;
  }
}

/** Текст уведомления об изменении. */
export function scheduleChangeNotice(
  event: Pick<ScheduleEventInput, "discipline" | "startsAt">,
  fields: readonly PlannedField[],
  reason: string,
): { title: string; body: string } {
  const cancelled = fields.some((f) => f.field === "CANCELLED");
  const when = formatSlot({
    date: toDateKey(event.startsAt),
    pair: pairOf(moscowTime(event.startsAt)),
    start: moscowTime(event.startsAt),
  });
  const lines = fields.map((f) => describeField(f.field, f.oldValue, f.newValue));
  return {
    title: cancelled
      ? `Пара отменена: ${event.discipline}`
      : `Изменение в расписании: ${event.discipline}`,
    body: `${when}. ${lines.join(". ")}. Причина: ${reason}`,
  };
}
