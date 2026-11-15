import { formatDateKeySmart, formatDayTime, pluralWorkingDays } from "@/lib/format-date";
import type { NormView } from "@/server/dal/norms";
import type { TimelineEntry } from "@/server/rules/application-stages";

import { PrototypeNote } from "./NormChip";
import { NormQuotes } from "./NormQuote";

const STATE_LABEL: Record<TimelineEntry["state"], string> = {
  done: "пройден",
  current: "сейчас",
  upcoming: "впереди",
};

/**
 * Этапы заявки со сроками (S4b, E2, мастер S4a). У каждого срока ссылка на пункт нормы
 * или пометка «так устроено в прототипе» — из данных типа заявки.
 */
export function StageTimeline({
  entries,
  norms,
  today,
  testId = "stage-timeline",
}: {
  entries: TimelineEntry[];
  norms: ReadonlyMap<string, NormView>;
  today: string;
  testId?: string;
}) {
  return (
    <ol className="border-border flex flex-col gap-4 border-l-2 pl-4" data-testid={testId}>
      {entries.map((e) => (
        <li
          key={e.status}
          data-stage={e.status}
          data-state={e.state}
          aria-current={e.state === "current" ? "step" : undefined}
        >
          <p className={e.state === "current" ? "font-semibold" : "font-medium"}>
            {e.title}
            <span className={e.state === "current" ? "text-accent" : "text-ink-muted"}>
              {" "}
              · {STATE_LABEL[e.state]}
            </span>
          </p>
          {e.enteredAt ? (
            <p className="text-ink-muted text-sm">
              <time dateTime={e.enteredAt.toISOString()}>{formatDayTime(e.enteredAt)}</time>
            </p>
          ) : null}
          {e.state === "upcoming" && e.due ? (
            <p className="text-sm" data-testid="stage-due">
              Срок: до {formatDateKeySmart(e.due, today)}
            </p>
          ) : null}
          {e.state === "upcoming" && !e.due && e.dueDays ? (
            <p className="text-sm">
              Срок: {pluralWorkingDays(e.dueDays.days)}{" "}
              {e.dueDays.from === "SUBMITTED" ? "со дня подачи" : "после предыдущего этапа"}
            </p>
          ) : null}
          {e.state === "upcoming" && e.basis ? (
            e.basis.kind === "NORM" ? (
              <NormQuotes codes={[e.basis.code]} norms={norms} />
            ) : (
              <PrototypeNote />
            )
          ) : null}
        </li>
      ))}
    </ol>
  );
}
