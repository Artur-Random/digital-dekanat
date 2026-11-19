import type { Metadata } from "next";

import { BackButton } from "@/components/BackButton";
import { NormChip } from "@/components/NormChip";
import { PendingSubmit } from "@/components/PendingSubmit";
import { formatDay, formatTime } from "@/lib/format-date";
import { toDateKey } from "@/lib/moscow-date";
import { normLabel } from "@/lib/norm-label";
import { requireStudent } from "@/server/auth/guards";
import { listNorms } from "@/server/dal/norms";
import { listNotifications } from "@/server/dal/notifications";

import { markAllRead, openNotification } from "./actions";

export const metadata: Metadata = { title: "Уведомления" };

function normCodes(text: string): string[] {
  return [...new Set(text.match(/N-\d+/g) ?? [])];
}

/** Коды норм в тексте уведомления («(N-15)») не показываем: ниже они чипами с документом и пунктом. */
function withoutCodes(text: string): string {
  return text.replace(/\s*\((?:N-\d+(?:,\s*)?)+\)/g, "");
}

export default async function NotificationsPage() {
  const actor = await requireStudent();
  const [notifications, norms] = await Promise.all([listNotifications(actor), listNorms(actor)]);
  const labels = new Map(norms.map((n) => [n.code, normLabel(n)]));
  const unread = notifications.filter((n) => !n.isRead).length;

  // Группы по дате (Москва), в порядке от новых к старым.
  const groups = new Map<string, typeof notifications>();
  for (const n of notifications) {
    const key = toDateKey(n.createdAt);
    groups.set(key, [...(groups.get(key) ?? []), n]);
  }

  return (
    <div className="max-w-4xl">
      <BackButton fallbackHref="/" />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Уведомления</h1>
        {unread > 0 ? (
          <form action={markAllRead}>
            <PendingSubmit
              pendingText="Отмечаем…"
              className="border-ink-muted inline-flex min-h-11 items-center rounded-md border px-4"
            >
              Отметить все прочитанными
            </PendingSubmit>
          </form>
        ) : null}
      </div>
      {notifications.length === 0 ? (
        <p className="text-ink-muted mt-4">
          Уведомлений пока нет. Сюда придут изменения расписания, пересдачи, статусы заявок и
          объявления деканата.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-6">
          {[...groups.values()].map((items) => {
            const first = items[0];
            if (!first) return null;
            return (
              <section key={first.id} aria-labelledby={`day-${first.id}`}>
                <h2 id={`day-${first.id}`} className="text-ink-muted text-sm font-semibold">
                  {formatDay(first.createdAt)}
                </h2>
                <ul className="mt-2 flex flex-col gap-2">
                  {items.map((n) => (
                    <li key={n.id}>
                      <form action={openNotification}>
                        <input type="hidden" name="id" value={n.id} />
                        <button
                          type="submit"
                          data-testid="notification"
                          data-read={n.isRead ? "true" : "false"}
                          className={`hover:bg-surface-muted w-full cursor-pointer rounded-md border p-3 text-left transition-colors ${
                            n.isRead ? "border-border" : "border-accent border-l-4"
                          }`}
                        >
                          <span className="flex flex-wrap items-center gap-2 text-sm">
                            {n.isRead ? null : (
                              <span className="bg-accent text-accent-ink rounded px-2 py-0.5 font-semibold">
                                Новое
                              </span>
                            )}
                            <span className="text-ink-muted">{formatTime(n.createdAt)}</span>
                          </span>
                          <span className={`mt-1 block ${n.isRead ? "" : "font-semibold"}`}>
                            {n.title}
                          </span>
                          <span className="text-ink-muted mt-1 block text-sm">
                            {withoutCodes(n.body)}
                          </span>
                        </button>
                      </form>
                      {/* Коды норм из текста — ссылками на «Почему так»: внутрь кнопки ссылку не вложить. */}
                      {normCodes(n.body).length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-2">
                          {normCodes(n.body).map((code) => (
                            <NormChip key={code} code={code} label={labels.get(code) ?? code} />
                          ))}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
