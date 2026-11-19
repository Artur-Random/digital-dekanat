import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";

import { DatePickerButton } from "@/components/DatePickerButton";
import { ScheduleItemView } from "@/components/ScheduleItemView";
import { TodayBlock } from "@/components/TodayBlock";
import { formatDateKey, formatDateKeyLong } from "@/lib/format-date";
import {
  type DateKey,
  addDays,
  isDateKey,
  mondayOf,
  moscowDateTime,
  todayInMoscow,
} from "@/lib/moscow-date";
import { type StudentActor, requireStudent } from "@/server/auth/guards";
import { listScheduleForStudent } from "@/server/dal/schedule";
import { getRetakeRule } from "@/server/dal/study";
import { academicYear } from "@/server/rules/academic-year";
import { buildTodayView, buildWeekView } from "@/server/rules/schedule";

export const metadata: Metadata = { title: "Расписание" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const DAY = 24 * 60 * 60 * 1000;

// Неделя из адреса. Некорректное значение — текущая неделя, а не ошибка.
const weekParam = z.string().refine(isDateKey);

function tabClass(active: boolean): string {
  // На 360 px вкладки и кнопка даты в одну строку: узкие отступы на телефоне.
  return `inline-flex min-h-11 items-center rounded-md px-3 font-medium md:px-4 ${
    active ? "bg-accent text-accent-ink" : "border-border border"
  }`;
}

export default async function SchedulePage({ searchParams }: Props) {
  const actor = await requireStudent();
  const params = await searchParams;
  const now = new Date();
  const today = todayInMoscow(now);
  const rawWeek = params.week;
  const year = academicYear(today);
  // Выбранный день: только текущий учебный год; иначе обычный вид «Сегодня».
  const dayParam = weekParam.safeParse(params.day);
  const pickedDay =
    dayParam.success && dayParam.data >= year.start && dayParam.data <= year.end
      ? dayParam.data
      : null;
  const tomorrow = addDays(today, 1);
  const view: "today" | "tomorrow" | "day" | "week" = pickedDay
    ? "day"
    : params.view === "tomorrow"
      ? "tomorrow"
      : params.view === "week" || rawWeek !== undefined
        ? "week"
        : "today";
  const isWeek = view === "week";
  const parsed = weekParam.safeParse(rawWeek);
  const weekStart: DateKey = mondayOf(parsed.success ? parsed.data : today);

  return (
    <>
      <h1 className="text-2xl font-semibold">Расписание</h1>
      <nav
        aria-label="Вид расписания"
        className="mt-4 flex flex-nowrap items-center gap-2 overflow-x-auto"
      >
        <Link
          href="/schedule"
          aria-current={view === "today" ? "page" : undefined}
          className={tabClass(view === "today")}
        >
          Сегодня
        </Link>
        <Link
          href="/schedule?view=tomorrow"
          aria-current={view === "tomorrow" ? "page" : undefined}
          className={tabClass(view === "tomorrow")}
        >
          Завтра
        </Link>
        <Link
          href="/schedule?view=week"
          aria-current={isWeek ? "page" : undefined}
          className={tabClass(isWeek)}
        >
          Неделя
        </Link>
        <DatePickerButton
          min={year.start}
          max={year.end}
          value={pickedDay ?? ""}
          active={view === "day"}
          activeLabel={pickedDay ? formatDateKeyLong(pickedDay) : undefined}
        />
      </nav>
      <div className="mt-6">
        {view === "week" ? (
          <Week actor={actor} actorWeek={weekStart} today={today} />
        ) : view === "today" ? (
          <Today actor={actor} now={now} />
        ) : (
          <Day actor={actor} day={pickedDay ?? tomorrow} today={today} />
        )}
      </div>
    </>
  );
}

async function Today({ actor, now }: { actor: StudentActor; now: Date }) {
  const schedule = await listScheduleForStudent(
    actor,
    new Date(now.getTime() - DAY),
    new Date(now.getTime() + 22 * DAY),
  );
  const view = buildTodayView(now, schedule.events, schedule.changes, schedule.calendar);
  return <TodayBlock view={view} retakeRule={await getRetakeRule(actor)} />;
}

/** Один день: «Завтра» или выбранная дата. */
async function Day({ actor, day, today }: { actor: StudentActor; day: DateKey; today: DateKey }) {
  const week = mondayOf(day);
  const [schedule, retakeRule] = await Promise.all([
    listScheduleForStudent(
      actor,
      moscowDateTime(week, "00:00"),
      moscowDateTime(addDays(week, 7), "00:00"),
    ),
    getRetakeRule(actor),
  ]);
  const days = buildWeekView(week, schedule.events, schedule.changes, schedule.calendar);
  const items = days.find((d) => d.date === day)?.items ?? [];
  const weekEmpty = days.every((d) => d.items.length === 0);
  return (
    <section aria-labelledby="day-title" data-testid="day-view" data-date={day}>
      <h2 id="day-title" className="text-lg font-semibold">
        {formatDateKeyLong(day)}
        {day === today ? <span className="text-accent"> · сегодня</span> : null}
      </h2>
      {items.length === 0 ? (
        <p className="text-ink-muted mt-4" data-testid="day-empty">
          {/* Будущая неделя без пар — расписание ещё не опубликовано; иначе в этот день пар нет. */}
          {weekEmpty && week > mondayOf(today)
            ? "Расписание на эту неделю ещё не опубликовано"
            : "В этот день пар нет"}{" "}
          <Link href={`/schedule?week=${week}`} className="text-accent underline">
            Вся неделя
          </Link>
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {items.map((item) => (
            <ScheduleItemView key={item.anchor} item={item} retakeRule={retakeRule} />
          ))}
        </ul>
      )}
    </section>
  );
}

async function Week({
  actor,
  actorWeek,
  today,
}: {
  actor: StudentActor;
  actorWeek: DateKey;
  today: DateKey;
}) {
  const from = moscowDateTime(actorWeek, "00:00");
  const to = moscowDateTime(addDays(actorWeek, 7), "00:00");
  const [schedule, retakeRule] = await Promise.all([
    listScheduleForStudent(actor, from, to),
    getRetakeRule(actor),
  ]);
  const days = buildWeekView(actorWeek, schedule.events, schedule.changes, schedule.calendar);
  const empty = days.every((d) => d.items.length === 0);
  const prev = addDays(actorWeek, -7);
  const next = addDays(actorWeek, 7);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold" data-testid="week-title" data-week={actorWeek}>
          {formatDateKey(actorWeek)} — {formatDateKey(addDays(actorWeek, 6))}
        </h2>
        {/* На телефоне в одну строку: стрелки с aria-label, «Текущая неделя» текстом. */}
        <div className="flex flex-nowrap gap-2">
          <Link
            href={`/schedule?week=${prev}`}
            aria-label="Предыдущая неделя"
            className="border-border inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md border px-2 md:px-3"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
            <span className="hidden md:inline">Предыдущая</span>
          </Link>
          {mondayOf(today) !== actorWeek ? (
            <Link
              href={`/schedule?week=${mondayOf(today)}`}
              className="border-border inline-flex min-h-11 items-center rounded-md border px-3 whitespace-nowrap"
            >
              Текущая неделя
            </Link>
          ) : null}
          <Link
            href={`/schedule?week=${next}`}
            aria-label="Следующая неделя"
            className="border-border inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md border px-2 md:px-3"
          >
            <span className="hidden md:inline">Следующая</span>
            <ChevronRight aria-hidden="true" className="size-5" />
          </Link>
        </div>
      </div>
      {empty ? (
        <p className="text-ink-muted mt-4" data-testid="week-empty">
          {/* Неделя в прошлом или текущая — расписание уже было, пар просто нет. */}
          {actorWeek > mondayOf(today)
            ? "Расписание на эту неделю ещё не опубликовано"
            : "На эту неделю пар нет"}
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-6">
          {days
            .filter((d) => d.isWorkingDay || d.items.length > 0)
            .map((d) => (
              <section key={d.date} aria-labelledby={`day-${d.date}`} data-date={d.date}>
                <h3 id={`day-${d.date}`} className="font-semibold">
                  {formatDateKeyLong(d.date)}
                  {d.date === today ? <span className="text-accent"> · сегодня</span> : null}
                </h3>
                {d.items.length === 0 ? (
                  <p className="text-ink-muted mt-2 text-sm">Пар нет</p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-2">
                    {d.items.map((item) => (
                      <ScheduleItemView key={item.anchor} item={item} retakeRule={retakeRule} />
                    ))}
                  </ul>
                )}
              </section>
            ))}
        </div>
      )}
    </>
  );
}
