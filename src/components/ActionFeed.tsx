import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { formatDateKey, formatDayTime } from "@/lib/format-date";
import type { ActionItem, Urgency } from "@/server/rules/action-feed";

import { NormChip, PrototypeNote } from "./NormChip";

const URGENCY_LABEL: Record<Urgency, string> = {
  today: "Сегодня",
  soon: "Скоро",
  later: "Позже",
};

const URGENCY_CLASS: Record<Urgency, string> = {
  today: "text-danger border-danger",
  soon: "text-warn border-warn",
  later: "text-ink-muted border-border",
};

function dueText(item: ActionItem): string | null {
  if (!item.dueAt) return null;
  return item.dueAt.kind === "datetime"
    ? formatDayTime(item.dueAt.at)
    : formatDateKey(item.dueAt.date);
}

export function ActionFeed({
  items,
  normLabels,
}: {
  items: ActionItem[];
  /** Подписи норм «документ, пункт» по коду. */
  normLabels: ReadonlyMap<string, string>;
}) {
  if (items.length === 0) {
    return <p className="text-ink-muted">Всё под контролем: новых задач нет</p>;
  }
  return (
    <ul className="flex flex-col gap-2" data-testid="action-feed">
      {items.map((item, i) => {
        const due = dueText(item);
        return (
          <li
            key={`${item.kind}-${item.href}-${i}`}
            data-kind={item.kind}
            className="border-border rounded-md border p-3"
          >
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span
                className={`rounded border px-2 py-0.5 font-semibold ${URGENCY_CLASS[item.urgency]}`}
              >
                {URGENCY_LABEL[item.urgency]}
              </span>
              {due ? <span>Срок: {due}</span> : null}
            </div>
            <Link
              href={item.href}
              className="mt-1 flex min-h-11 items-center justify-between gap-2 font-medium hover:underline"
            >
              <span>{item.title}</span>
              <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
            </Link>
            <p className="text-ink-muted text-sm">{item.details}</p>
            {item.normCodes.length > 0 || item.prototypeAssumption ? (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {item.normCodes.map((code) => (
                  <NormChip key={code} code={code} label={normLabels.get(code) ?? code} />
                ))}
                {item.prototypeAssumption ? <PrototypeNote /> : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
