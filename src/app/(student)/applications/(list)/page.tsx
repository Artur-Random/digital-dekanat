import { ChevronRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { formatDateOnly, formatDay } from "@/lib/format-date";
import { findBranch, isClosed, parseStages, statusTitle } from "@/server/rules/application-stages";
import { requireStudent } from "@/server/auth/guards";
import { ApplicationLimitNotice } from "@/components/ApplicationLimitNotice";
import { getApplicationLimitView } from "@/server/dal/applications";
import { listStudentApplications } from "@/server/dal/students";

export const metadata: Metadata = { title: "Заявки и справки" };

type Row = Awaited<ReturnType<typeof listStudentApplications>>[number];

function ApplicationList({ items, testId }: { items: Row[]; testId: string }) {
  return (
    <ul className="mt-3 flex flex-col gap-2" data-testid={testId}>
      {items.map((app) => {
        const stages = parseStages(app.type.stages);
        return (
          <li key={app.id}>
            <Link
              href={`/applications/${app.id}`}
              data-testid="application-row"
              className="border-border hover:bg-surface-muted flex min-h-11 items-center justify-between gap-3 rounded-md border p-3"
            >
              <span>
                <span className="block font-medium">{app.type.title}</span>
                <span className="text-ink-muted block text-sm">
                  {statusTitle(stages, app.status, app.branch)} · от {formatDay(app.createdAt)}
                  {app.stageDeadline ? ` · срок до ${formatDateOnly(app.stageDeadline)}` : ""}
                </span>
              </span>
              <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// S4: активные и архив, кнопка «Новая заявка».
export default async function ApplicationsPage() {
  const actor = await requireStudent();
  const [applications, limit] = await Promise.all([
    listStudentApplications(actor),
    getApplicationLimitView(actor),
  ]);
  // Та же граница, что у лимита: завершённые — отказ, отмена или пройден последний этап
  // (готовая справка тоже: решения ждать не нужно).
  const closed = (app: Row) =>
    isClosed(findBranch(parseStages(app.type.stages), app.branch), app.status);
  const active = applications.filter((a) => !closed(a));
  const archive = applications.filter(closed);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Заявки и справки</h1>
        {limit.reached ? (
          // Неактивная кнопка: ссылки нет, причина рядом и связана через aria-describedby.
          <span
            role="link"
            aria-disabled="true"
            aria-describedby="limit-note"
            data-testid="new-application"
            data-disabled="true"
            className="bg-surface-muted text-ink-muted border-border inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-md border px-4 font-medium"
          >
            <Plus aria-hidden="true" className="size-5" />
            Новая заявка
          </span>
        ) : (
          <Link
            href="/applications/new"
            data-testid="new-application"
            className="bg-accent text-accent-ink inline-flex min-h-11 items-center gap-2 rounded-md px-4 font-medium"
          >
            <Plus aria-hidden="true" className="size-5" />
            Новая заявка
          </Link>
        )}
      </div>
      {limit.reached ? (
        <div id="limit-note">
          <ApplicationLimitNotice text={limit.text} showExempt />
        </div>
      ) : null}
      {applications.length === 0 ? (
        <p className="text-ink-muted mt-4">
          Заявок пока нет. Нажмите «Новая заявка», чтобы заказать справку или подать заявление.
        </p>
      ) : (
        <>
          <section aria-labelledby="active-title" className="mt-6">
            <h2 id="active-title" className="text-lg font-semibold">
              Активные
            </h2>
            {active.length === 0 ? (
              <p className="text-ink-muted mt-2">Активных заявок нет.</p>
            ) : (
              <ApplicationList items={active} testId="applications-active" />
            )}
          </section>
          {archive.length > 0 ? (
            <section aria-labelledby="archive-title" className="mt-8">
              <h2 id="archive-title" className="text-lg font-semibold">
                Завершённые
              </h2>
              <ApplicationList items={archive} testId="applications-archive" />
            </section>
          ) : null}
        </>
      )}
    </>
  );
}
