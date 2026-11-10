import type { ApplicationStatus } from "@/generated/prisma/enums";
import { formatDayTime } from "@/lib/format-date";
import { type StageBranch, statusTitle } from "@/server/rules/application-stages";

type HistoryEvent = {
  id: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  comment: string | null;
  createdAt: Date;
};

type ApplicationHistoryProps = { events: HistoryEvent[]; stages: StageBranch[] };

export function ApplicationHistory({ events, stages }: ApplicationHistoryProps) {
  if (events.length === 0) {
    return <p className="text-ink-muted">История пока пустая.</p>;
  }
  return (
    <ol className="border-border flex flex-col gap-4 border-l-2 pl-4">
      {events.map((event) => (
        <li key={event.id}>
          <p className="font-medium">{statusTitle(stages, event.toStatus)}</p>
          <p className="text-ink-muted text-sm">
            <time dateTime={event.createdAt.toISOString()}>{formatDayTime(event.createdAt)}</time>
          </p>
          {event.comment ? <p className="mt-1">{event.comment}</p> : null}
        </li>
      ))}
    </ol>
  );
}
