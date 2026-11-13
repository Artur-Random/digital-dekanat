import { formatDateKeyLong } from "@/lib/format-date";
import type { TodayView } from "@/server/rules/schedule";

import { type RetakeRule, ScheduleItemView } from "./ScheduleItemView";

/** Пары ближайшего учебного дня: «Сегодня» на главной и во вкладке расписания. */
export function TodayBlock({
  view,
  retakeRule,
  headingLevel = 2,
}: {
  view: TodayView;
  retakeRule: RetakeRule;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div data-testid="today-block" data-date={view.date}>
      {view.noClassesToday ? (
        <>
          <p className="font-medium" data-testid="no-classes-today">
            Сегодня пар нет
          </p>
          <Heading className="text-ink-muted mt-1 text-base font-normal">
            Ближайшие пары: {formatDateKeyLong(view.date)}
          </Heading>
        </>
      ) : (
        <>
          <Heading className="text-ink-muted text-base font-normal">
            {formatDateKeyLong(view.date)}
          </Heading>
          {view.items.every(
            (i) => i.status !== "now" && i.status !== "next" && i.status !== "upcoming",
          ) ? (
            <p className="mt-1 font-medium" data-testid="day-over">
              Пары на сегодня закончились
            </p>
          ) : null}
        </>
      )}
      {view.items.length === 0 ? (
        <p className="text-ink-muted mt-3">Расписание на ближайшие дни ещё не опубликовано.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {view.items.map((item) => (
            <ScheduleItemView key={item.anchor} item={item} retakeRule={retakeRule} />
          ))}
        </ul>
      )}
    </div>
  );
}
