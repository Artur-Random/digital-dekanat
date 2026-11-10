import type { ApplicationStatus } from "@/generated/prisma/enums";
import { formatDayTime } from "@/lib/format-date";
import { APPLICATION_STATUS_LABEL } from "@/lib/labels";

type HistoryEvent = {
  id: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  comment: string | null;
  createdAt: Date;
};

export function ApplicationHistory({ events }: { events: HistoryEvent[] }) {
  if (events.length === 0) {
    return <p className="text-ink-muted">История пока пустая.</p>;
  }
  return (
    <ol className="border-border flex flex-col gap-4 border-l-2 pl-4">
      {events.map((event) => (
        <li key={event.id}>
          <p className="font-medium">{APPLICATION_STATUS_LABEL[event.toStatus]}</p>
          <p className="text-ink-muted text-sm">
            <time dateTime={event.createdAt.toISOString()}>{formatDayTime(event.createdAt)}</time>
          </p>
          {event.comment ? <p className="mt-1">{event.comment}</p> : null}
        </li>
      ))}
    </ol>
  );
}
