import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";

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
import { buildTodayView, buildWeekView } from "@/server/rules/schedule";

export const metadata: Metadata = { title: "Расписание" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const DAY = 24 * 60 * 60 * 1000;

// Неделя из адреса. Некорректное значение — текущая неделя, а не ошибка.
const weekParam = z.string().refine(isDateKey);

function tabClass(active: boolean): string {
  return `inline-flex min-h-11 items-center rounded-md px-4 font-medium ${
    active ? "bg-accent text-accent-ink" : "border-border border"
  }`;
}

export default async function SchedulePage({ searchParams }: Props) {
  const actor = await requireStudent();
  const params = await searchParams;
  const now = new Date();
  const today = todayInMoscow(now);
  const rawWeek = params.week;
  const isWeek = params.view === "week" || rawWeek !== undefined;
  const parsed = weekParam.safeParse(rawWeek);
  const weekStart: DateKey = mondayOf(parsed.success ? parsed.data : today);

  return (
    <>
      <h1 className="text-2xl font-semibold">Расписание</h1>
      <nav aria-label="Вид расписания" className="mt-4 flex gap-2">
        <Link
          href="/schedule"
          aria-current={isWeek ? undefined : "page"}
          className={tabClass(!isWeek)}
        >
          Сегодня
        </Link>
        <Link
          href="/schedule?view=week"
          aria-current={isWeek ? "page" : undefined}
          className={tabClass(isWeek)}
        >
          Неделя
        </Link>
      </nav>
      <div className="mt-6">
        {isWeek ? (
          <Week actor={actor} actorWeek={weekStart} today={today} />
        ) : (
          <Today actor={actor} now={now} />
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
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/schedule?week=${prev}`}
            className="border-border inline-flex min-h-11 items-center gap-1 rounded-md border px-3"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
            Предыдущая
          </Link>
          {mondayOf(today) !== actorWeek ? (
            <Link
              href={`/schedule?week=${mondayOf(today)}`}
              className="border-border inline-flex min-h-11 items-center rounded-md border px-3"
            >
              Текущая неделя
            </Link>
          ) : null}
          <Link
            href={`/schedule?week=${next}`}
            className="border-border inline-flex min-h-11 items-center gap-1 rounded-md border px-3"
          >
            Следующая
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
