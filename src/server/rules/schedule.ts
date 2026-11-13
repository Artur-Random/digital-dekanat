// Расписание: ближайший учебный день, виды «Сегодня» и «Неделя» с изменениями «было → стало».
// Чистые функции: время «сейчас» передаётся явно, системные часы не читаются.
// Событие в базе хранит текущее состояние, ScheduleChange — историю: что было и что стало.

import type {
  DeliveryFormat,
  ScheduleChangeField,
  ScheduleEventType,
} from "@/generated/prisma/enums";
import { type DateKey, addDays, mondayOf, moscowTime, toDateKey } from "@/lib/moscow-date";

import { pairOf } from "./bells";
import { type ProductionCalendar, isWorkingDay } from "./working-days";

export type ScheduleEventInput = {
  id: string;
  type: ScheduleEventType;
  startsAt: Date;
  endsAt: Date;
  discipline: string;
  teacher: string;
  room: string | null;
  platform: string | null;
  format: DeliveryFormat;
};

export type ScheduleChangeInput = {
  eventId: string;
  field: ScheduleChangeField;
  oldValue: string;
  newValue: string;
  reason: string;
  createdAt: Date;
};

/** Место пары в сетке: дата, номер пары, время начала. */
export type Slot = { date: DateKey; pair: number | null; start: string };

/** Одно изменённое поле. Для START_TIME значения — моменты в ISO (UTC). */
export type ScheduleDiff = {
  field: Exclude<ScheduleChangeField, "CANCELLED">;
  from: string;
  to: string;
};

export type ItemStatus = "past" | "now" | "next" | "upcoming" | "cancelled" | "moved";

export type ScheduleItem = {
  /** Якорь на странице расписания: уведомление ведёт на конкретную пару. */
  anchor: string;
  eventId: string;
  /** event — пара в этот день; moved-away — строка «перенесена на …» в старом дне. */
  kind: "event" | "moved-away";
  type: ScheduleEventType;
  isRetake: boolean;
  date: DateKey;
  pair: number | null;
  start: string;
  end: string;
  discipline: string;
  teacher: string;
  room: string | null;
  platform: string | null;
  format: DeliveryFormat;
  cancelled: boolean;
  diffs: ScheduleDiff[];
  /** Причина последнего изменения. */
  reason: string | null;
  movedFrom: Slot | null;
  movedTo: Slot | null;
  status: ItemStatus;
};

export const RETAKE_TYPES: readonly ScheduleEventType[] = ["RETAKE_1", "RETAKE_2"];

export function isRetake(type: ScheduleEventType): boolean {
  return RETAKE_TYPES.includes(type);
}

export function eventAnchor(eventId: string): string {
  return `event-${eventId}`;
}

/** Ссылка на пару в недельном расписании: уведомления и лента ведут сюда. */
export function scheduleLink(date: DateKey, eventId: string): string {
  return `/schedule?week=${mondayOf(date)}#${eventAnchor(eventId)}`;
}

/** Ближайший учебный день: сегодня, если сегодня рабочий день, иначе следующий рабочий. */
export function nextStudyDay(now: Date, calendar: ProductionCalendar): DateKey {
  let day = toDateKey(now);
  while (!isWorkingDay(day, calendar)) day = addDays(day, 1);
  return day;
}

/** Следующий рабочий день строго после day. */
export function studyDayAfter(day: DateKey, calendar: ProductionCalendar): DateKey {
  let next = addDays(day, 1);
  while (!isWorkingDay(next, calendar)) next = addDays(next, 1);
  return next;
}

function slotOf(date: Date): Slot {
  const start = moscowTime(date);
  return { date: toDateKey(date), pair: pairOf(start), start };
}

type Aggregated = {
  cancelled: boolean;
  diffs: ScheduleDiff[];
  reason: string | null;
  /** Исходное время начала, если оно менялось. */
  originalStart: Date | null;
};

/** Сводит историю изменений события: по каждому полю первое «было» и последнее «стало». */
function aggregate(changes: readonly ScheduleChangeInput[]): Aggregated {
  const sorted = [...changes].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const byField = new Map<ScheduleChangeField, { from: string; to: string }>();
  for (const c of sorted) {
    const prev = byField.get(c.field);
    byField.set(c.field, { from: prev ? prev.from : c.oldValue, to: c.newValue });
  }
  const diffs: ScheduleDiff[] = [];
  for (const [field, v] of byField) {
    if (field === "CANCELLED" || v.from === v.to) continue;
    diffs.push({ field, from: v.from, to: v.to });
  }
  const startDiff = diffs.find((d) => d.field === "START_TIME");
  return {
    cancelled: byField.get("CANCELLED")?.to === "true",
    diffs,
    reason: sorted.at(-1)?.reason ?? null,
    originalStart: startDiff ? new Date(startDiff.from) : null,
  };
}

function groupChanges(changes: readonly ScheduleChangeInput[]): Map<string, ScheduleChangeInput[]> {
  const map = new Map<string, ScheduleChangeInput[]>();
  for (const c of changes) {
    const list = map.get(c.eventId) ?? [];
    list.push(c);
    map.set(c.eventId, list);
  }
  return map;
}

function baseItem(
  event: ScheduleEventInput,
  agg: Aggregated,
): Omit<ScheduleItem, "anchor" | "kind" | "date" | "pair" | "start" | "end" | "status"> {
  return {
    eventId: event.id,
    type: event.type,
    isRetake: isRetake(event.type),
    discipline: event.discipline,
    teacher: event.teacher,
    room: event.room,
    platform: event.platform,
    format: event.format,
    cancelled: agg.cancelled,
    diffs: agg.diffs,
    reason: agg.reason,
    movedFrom: null,
    movedTo: null,
  };
}

/** Пары одного дня, включая строки «перенесена на …» для пар, ушедших с этого дня. */
export function dayItems(
  day: DateKey,
  events: readonly ScheduleEventInput[],
  changes: readonly ScheduleChangeInput[],
): ScheduleItem[] {
  const byEvent = groupChanges(changes);
  const items: ScheduleItem[] = [];
  for (const event of events) {
    const agg = aggregate(byEvent.get(event.id) ?? []);
    const current = slotOf(event.startsAt);
    const original = agg.originalStart ? slotOf(agg.originalStart) : null;
    const movedToOtherDay = original !== null && original.date !== current.date;
    if (current.date === day) {
      items.push({
        ...baseItem(event, agg),
        anchor: eventAnchor(event.id),
        kind: "event",
        date: day,
        pair: current.pair,
        start: current.start,
        end: moscowTime(event.endsAt),
        movedFrom: movedToOtherDay ? original : null,
        status: agg.cancelled ? "cancelled" : "upcoming",
      });
    }
    if (movedToOtherDay && original.date === day && agg.originalStart) {
      const duration = event.endsAt.getTime() - event.startsAt.getTime();
      items.push({
        ...baseItem(event, agg),
        anchor: `moved-${event.id}`,
        kind: "moved-away",
        date: day,
        pair: original.pair,
        start: original.start,
        end: moscowTime(new Date(agg.originalStart.getTime() + duration)),
        movedTo: current,
        status: "moved",
      });
    }
  }
  return items.sort((a, b) => a.start.localeCompare(b.start) || a.kind.localeCompare(b.kind));
}

/** Статусы пар сегодняшнего дня относительно now. */
function withStatuses(
  items: ScheduleItem[],
  now: Date,
  events: readonly ScheduleEventInput[],
): ScheduleItem[] {
  const byId = new Map(events.map((e) => [e.id, e]));
  let nextAssigned = false;
  return items.map((item) => {
    if (item.kind !== "event" || item.cancelled) return item;
    const event = byId.get(item.eventId);
    if (!event) return item;
    let status: ItemStatus;
    if (event.endsAt.getTime() <= now.getTime()) status = "past";
    else if (event.startsAt.getTime() <= now.getTime()) status = "now";
    else if (!nextAssigned) {
      status = "next";
      nextAssigned = true;
    } else status = "upcoming";
    return { ...item, status };
  });
}

export type TodayView = {
  today: DateKey;
  /** День, пары которого показаны: сегодня или следующий учебный день с парами. */
  date: DateKey;
  noClassesToday: boolean;
  items: ScheduleItem[];
};

/** Сколько дней вперёд искать следующий учебный день с парами (каникулы, праздники). */
const LOOKAHEAD_DAYS = 21;

export function buildTodayView(
  now: Date,
  events: readonly ScheduleEventInput[],
  changes: readonly ScheduleChangeInput[],
  calendar: ProductionCalendar,
): TodayView {
  const today = toDateKey(now);
  const hasPairs = (day: DateKey) => dayItems(day, events, changes).some((i) => i.kind === "event");

  if (isWorkingDay(today, calendar) && hasPairs(today)) {
    return {
      today,
      date: today,
      noClassesToday: false,
      items: withStatuses(dayItems(today, events, changes), now, events),
    };
  }
  let day = studyDayAfter(today, calendar);
  const fallback = day;
  for (let i = 0; i < LOOKAHEAD_DAYS && !hasPairs(day); i++) day = studyDayAfter(day, calendar);
  const date = hasPairs(day) ? day : fallback;
  return { today, date, noClassesToday: true, items: dayItems(date, events, changes) };
}

export type WeekDay = { date: DateKey; isWorkingDay: boolean; items: ScheduleItem[] };

/** Неделя с понедельника weekStart: семь дней, выходные без пар интерфейс скрывает. */
export function buildWeekView(
  weekStart: DateKey,
  events: readonly ScheduleEventInput[],
  changes: readonly ScheduleChangeInput[],
  calendar: ProductionCalendar,
): WeekDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    return {
      date,
      isWorkingDay: isWorkingDay(date, calendar),
      items: dayItems(date, events, changes),
    };
  });
}

/** Есть ли у пары изменения, о которых стоит сказать студенту. */
export function isChanged(item: ScheduleItem): boolean {
  return item.cancelled || item.diffs.length > 0 || item.kind === "moved-away";
}
