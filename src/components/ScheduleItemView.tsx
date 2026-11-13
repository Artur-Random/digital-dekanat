import { formatSlot } from "@/lib/format-date";
import { EVENT_TYPE_LABEL, FORMAT_LABEL } from "@/lib/schedule-labels";
import type { ItemStatus, ScheduleItem } from "@/server/rules/schedule";
import { describeField } from "@/server/rules/schedule-change";

import { NormChip } from "./NormChip";

const STATUS_LABEL: Partial<Record<ItemStatus, string>> = {
  past: "Прошла",
  now: "Идёт сейчас",
  next: "Следующая",
};

function place(item: ScheduleItem): string {
  if (item.format === "ONLINE") return item.platform ?? FORMAT_LABEL.ONLINE;
  return item.room ? `ауд. ${item.room}` : "аудитория не указана";
}

/** Одна пара. Значение передаётся текстом (метки «Отменена», «Изменено»), а не только цветом. */
export function ScheduleItemView({ item }: { item: ScheduleItem }) {
  const pairLabel = item.pair === null ? "" : `${item.pair} пара · `;

  if (item.kind === "moved-away") {
    return (
      <li
        id={item.anchor}
        data-testid="schedule-item"
        data-kind="moved-away"
        className="border-border text-ink-muted scroll-mt-24 rounded-md border border-dashed p-3"
      >
        <p className="text-sm">
          {pairLabel}
          {item.start}–{item.end}
        </p>
        <p className="font-medium line-through">{item.discipline}</p>
        <p className="mt-1 text-sm" data-testid="moved-to">
          {item.movedTo ? `Перенесена на ${formatSlot(item.movedTo)}` : "Перенесена"}
          {item.reason ? `. Причина: ${item.reason}` : ""}
        </p>
      </li>
    );
  }

  const changed = item.diffs.length > 0 || item.movedFrom !== null;
  const status = STATUS_LABEL[item.status];
  return (
    <li
      id={item.anchor}
      data-testid="schedule-item"
      data-kind={item.isRetake ? "retake" : "event"}
      data-status={item.status}
      data-pair={item.pair ?? undefined}
      className={`scroll-mt-24 rounded-md border p-3 ${
        item.isRetake ? "border-warn bg-notice" : "border-border"
      } ${item.status === "now" ? "border-l-accent border-l-4" : ""} ${
        item.status === "past" ? "text-ink-muted" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="font-medium">
          {pairLabel}
          {item.start}–{item.end}
        </span>
        {status ? (
          <span className="bg-surface-muted rounded px-2 py-0.5" data-testid="item-status">
            {status}
          </span>
        ) : null}
        {item.cancelled ? (
          <span className="text-danger border-danger rounded border px-2 py-0.5 font-semibold">
            Отменена
          </span>
        ) : null}
        {changed && !item.cancelled ? (
          <span
            className="text-warn border-warn rounded border px-2 py-0.5 font-semibold"
            data-testid="changed-badge"
          >
            Изменено
          </span>
        ) : null}
      </div>
      <p className={`mt-1 font-medium ${item.cancelled ? "line-through" : ""}`}>
        {item.discipline}
      </p>
      <p className="text-ink-muted text-sm">
        {EVENT_TYPE_LABEL[item.type]} · {item.teacher} · {place(item)}
      </p>
      {item.movedFrom ? (
        <p className="mt-1 text-sm" data-testid="moved-from">
          Перенесена с {formatSlot(item.movedFrom)}
        </p>
      ) : null}
      {item.diffs.length > 0 ? (
        <ul className="mt-1 text-sm" data-testid="diffs">
          {item.diffs
            .filter((d) => !(d.field === "START_TIME" && item.movedFrom))
            .map((d) => (
              <li key={d.field}>{describeField(d.field, d.from, d.to)}</li>
            ))}
        </ul>
      ) : null}
      {item.reason && (changed || item.cancelled) ? (
        <p className="text-ink-muted mt-1 text-sm">Причина: {item.reason}</p>
      ) : null}
      {item.isRetake ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span>Дату и время пересдачи менять нельзя</span>
          <NormChip code="N-15" />
        </div>
      ) : null}
    </li>
  );
}
