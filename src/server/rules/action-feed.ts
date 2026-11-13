// Лента «Нужно сделать» на главной (S1). Чистая функция от контекста студента;
// «сейчас» передаётся явно. Не хранится, а вычисляется на сервере (spec, раздел 4).

import type {
  ApplicationStatus,
  ApplicationTypeCode,
  Funding,
  StudyForm,
} from "@/generated/prisma/enums";
import { type DateKey, addDays, moscowTime, toDateKey } from "@/lib/moscow-date";
import { formatDateKey, formatSlot, pluralDays } from "@/lib/format-date";

import type { StageBranch } from "./application-stages";
import { statusTitle } from "./application-stages";
import { pairOf } from "./bells";
import { describeField } from "./schedule-change";
import {
  type ScheduleChangeInput,
  type ScheduleEventInput,
  type ScheduleItem,
  dayItems,
  isChanged,
  isRetake,
  nextStudyDay,
  scheduleLink,
  studyDayAfter,
} from "./schedule";
import { type ProductionCalendar, addWorkingDays } from "./working-days";

export type Urgency = "today" | "soon" | "later";

/**
 * Виды элементов. absence-notice («Не смогу прийти», задание 6) и debt (долги, задание 5)
 * объявлены заранее и пока не формируются.
 */
export type ActionKind =
  | "schedule-change"
  | "retake"
  | "application-ready"
  | "application-progress"
  | "scholarship-window"
  | "absence-notice"
  | "debt";

export type ActionItem = {
  kind: ActionKind;
  title: string;
  details: string;
  /** Срок: момент (пара, пересдача) или календарная дата (заявка, окно стипендии). */
  dueAt: { kind: "datetime"; at: Date } | { kind: "date"; date: DateKey } | null;
  urgency: Urgency;
  href: string;
  normCodes: string[];
  /** Срок или правило не из реестра норм: «так устроено в прототипе». */
  prototypeAssumption: boolean;
};

export type FeedApplication = {
  id: string;
  typeCode: ApplicationTypeCode;
  title: string;
  status: ApplicationStatus;
  branch: string;
  stageDeadline: Date | null;
  stages: StageBranch[];
  unitName: string;
};

export type ActionFeedContext = {
  calendar: ProductionCalendar;
  student: { studyForm: StudyForm; funding: Funding };
  /** События студента (группа и личные) на ближайшие две недели. */
  events: ScheduleEventInput[];
  changes: ScheduleChangeInput[];
  applications: FeedApplication[];
};

/** Изменения расписания показываем на ближайшие 2 учебных дня. */
const CHANGE_HORIZON_STUDY_DAYS = 2;
/** Пересдачи — в ближайшие 14 дней. */
const RETAKE_HORIZON_DAYS = 14;
/** Окно стипендии показываем, если оно открыто или откроется не позже чем через 30 дней. */
const SCHOLARSHIP_LEAD_DAYS = 30;
/** «Скоро» — срок в ближайшие 3 рабочих дня. */
const SOON_WORKING_DAYS = 3;

const FINAL_STATUSES: readonly ApplicationStatus[] = [
  "READY",
  "APPROVED",
  "REJECTED",
  "ORDER_SIGNED",
  "CANCELLED",
];

const URGENCY_ORDER: Record<Urgency, number> = { today: 0, soon: 1, later: 2 };

export function urgencyFor(due: DateKey, today: DateKey, calendar: ProductionCalendar): Urgency {
  if (due <= today) return "today";
  if (due <= addWorkingDays(today, SOON_WORKING_DAYS, calendar)) return "soon";
  return "later";
}

function changeDetails(item: ScheduleItem): string {
  if (item.cancelled) return "Пара отменена";
  if (item.kind === "moved-away" && item.movedTo)
    return `Перенесена на ${formatSlot(item.movedTo)}`;
  return item.diffs.map((d) => describeField(d.field, d.from, d.to)).join(". ");
}

function scheduleChangeItems(now: Date, ctx: ActionFeedContext): ActionItem[] {
  const today = toDateKey(now);
  const days: DateKey[] = [nextStudyDay(now, ctx.calendar)];
  while (days.length < CHANGE_HORIZON_STUDY_DAYS) {
    const last = days.at(-1);
    if (!last) break;
    days.push(studyDayAfter(last, ctx.calendar));
  }
  const result: ActionItem[] = [];
  for (const day of days) {
    for (const item of dayItems(day, ctx.events, ctx.changes)) {
      if (!isChanged(item)) continue;
      // Пары, ушедшие с этого дня, показываем строкой в новом дне, если он тоже в горизонте.
      if (item.kind === "moved-away" && item.movedTo && days.includes(item.movedTo.date)) continue;
      result.push({
        kind: "schedule-change",
        title: `${item.cancelled ? "Отмена пары" : "Изменение в расписании"}: ${item.discipline}`,
        details: `${formatSlot(item)}. ${changeDetails(item)}`,
        dueAt: { kind: "date", date: day },
        urgency: urgencyFor(day, today, ctx.calendar),
        href: scheduleLink(
          item.kind === "moved-away" && item.movedTo ? item.movedTo.date : day,
          item.eventId,
        ),
        normCodes: [],
        prototypeAssumption: false,
      });
    }
  }
  return result;
}

function retakeTitle(discipline: string, daysLeft: number): string {
  if (daysLeft <= 0) return `Пересдача по дисциплине «${discipline}» сегодня`;
  if (daysLeft === 1) return `Пересдача по дисциплине «${discipline}» завтра`;
  return `Пересдача по дисциплине «${discipline}» через ${pluralDays(daysLeft)}`;
}

function daysBetween(from: DateKey, to: DateKey): number {
  return Math.round(
    (new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / 86_400_000,
  );
}

function retakeItems(now: Date, ctx: ActionFeedContext): ActionItem[] {
  const today = toDateKey(now);
  const horizon = addDays(today, RETAKE_HORIZON_DAYS);
  return ctx.events
    .filter((e) => isRetake(e.type) && e.endsAt > now && toDateKey(e.startsAt) <= horizon)
    .map((e) => {
      const date = toDateKey(e.startsAt);
      const stage = e.type === "RETAKE_1" ? "I" : "II";
      const place =
        e.format === "ONLINE" ? (e.platform ?? "дистанционно") : `ауд. ${e.room ?? "—"}`;
      return {
        kind: "retake" as const,
        title: retakeTitle(e.discipline, daysBetween(today, date)),
        details: `Этап ${stage}. ${formatSlot({ date, pair: pairOf(moscowTime(e.startsAt)), start: moscowTime(e.startsAt) })}, ${place}`,
        dueAt: { kind: "datetime" as const, at: e.startsAt },
        urgency: urgencyFor(date, today, ctx.calendar),
        href: scheduleLink(date, e.id),
        normCodes: ["N-17", "N-14"],
        prototypeAssumption: false,
      };
    });
}

/** «в МФЦ», «в деканате»: без номеров кабинетов. */
function placeOf(unitName: string): string {
  if (unitName.includes("МФЦ")) return "в МФЦ";
  if (unitName.toLowerCase().includes("деканат")) return "в деканате";
  return `в подразделении «${unitName}»`;
}

function applicationItems(now: Date, ctx: ActionFeedContext): ActionItem[] {
  const today = toDateKey(now);
  const result: ActionItem[] = [];
  for (const app of ctx.applications) {
    const href = `/applications/${app.id}`;
    if (app.status === "READY") {
      const isCertificate = app.typeCode.startsWith("CERT_");
      result.push({
        kind: "application-ready",
        title: isCertificate
          ? `Справка готова, забрать ${placeOf(app.unitName)}`
          : `${app.title}: готово, забрать ${placeOf(app.unitName)}`,
        details: app.title,
        dueAt: null,
        urgency: "soon",
        href,
        normCodes: [],
        prototypeAssumption: false,
      });
      continue;
    }
    if (FINAL_STATUSES.includes(app.status) || !app.stageDeadline) continue;
    const branch = app.stages.find((b) => b.code === app.branch);
    const index = branch ? branch.stages.findIndex((s) => s.status === app.status) : -1;
    const next = branch && index >= 0 ? branch.stages[index + 1] : undefined;
    const basis = next?.basis ?? null;
    const due = app.stageDeadline.toISOString().slice(0, 10);
    result.push({
      kind: "application-progress",
      title: app.title,
      details: `${statusTitle(app.stages, app.status, app.branch)}. Следующий этап «${next?.title ?? "решение"}» — до ${formatDateKey(due)}`,
      dueAt: { kind: "date", date: due },
      urgency: urgencyFor(due, today, ctx.calendar),
      href,
      normCodes: basis?.kind === "NORM" ? [basis.code] : [],
      prototypeAssumption: basis?.kind === "PROTOTYPE_ASSUMPTION",
    });
  }
  return result;
}

/** Окна подачи документов на повышенную стипендию (N-29). */
function scholarshipWindows(year: number): { opens: DateKey; closes: DateKey }[] {
  return [
    { opens: `${year}-02-05`, closes: `${year}-03-05` },
    { opens: `${year}-07-10`, closes: `${year}-08-10` },
  ];
}

function scholarshipItems(now: Date, ctx: ActionFeedContext): ActionItem[] {
  // N-22: повышенная стипендия — только очная форма и бюджет.
  if (ctx.student.studyForm !== "FULL_TIME" || ctx.student.funding !== "BUDGET") return [];
  const today = toDateKey(now);
  const year = Number(today.slice(0, 4));
  const windows = [...scholarshipWindows(year), ...scholarshipWindows(year + 1)];
  const open = windows.find((w) => w.opens <= today && today <= w.closes);
  const normCodes = ["N-29", "N-22"];
  const href = "/why#N-29";
  if (open) {
    return [
      {
        kind: "scholarship-window",
        title: "Открыт приём документов на повышенную стипендию",
        details: `Документы о достижениях принимаются до ${formatDateKey(open.closes)}`,
        dueAt: { kind: "date", date: open.closes },
        urgency: urgencyFor(open.closes, today, ctx.calendar),
        href,
        normCodes,
        prototypeAssumption: false,
      },
    ];
  }
  const upcoming = windows.find(
    (w) => w.opens > today && daysBetween(today, w.opens) <= SCHOLARSHIP_LEAD_DAYS,
  );
  if (!upcoming) return [];
  return [
    {
      kind: "scholarship-window",
      title: `Окно подачи документов на повышенную стипендию откроется ${formatDateKey(upcoming.opens)}`,
      details: `Приём документов с ${formatDateKey(upcoming.opens)} по ${formatDateKey(upcoming.closes)}`,
      dueAt: { kind: "date", date: upcoming.opens },
      urgency: "later",
      href,
      normCodes,
      prototypeAssumption: false,
    },
  ];
}

function dueTime(item: ActionItem): number {
  if (!item.dueAt) return Number.POSITIVE_INFINITY;
  return item.dueAt.kind === "datetime"
    ? item.dueAt.at.getTime()
    : new Date(`${item.dueAt.date}T00:00:00+03:00`).getTime();
}

export function buildActionFeed(now: Date, ctx: ActionFeedContext): ActionItem[] {
  return [
    ...scheduleChangeItems(now, ctx),
    ...retakeItems(now, ctx),
    ...applicationItems(now, ctx),
    ...scholarshipItems(now, ctx),
  ].sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency] || dueTime(a) - dueTime(b));
}
