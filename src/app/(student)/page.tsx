import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ActionFeed } from "@/components/ActionFeed";
import { SectionSkeleton } from "@/components/SectionSkeleton";
import { TodayBlock } from "@/components/TodayBlock";
import { formatDateKey } from "@/lib/format-date";
import { requireStudent, type StudentActor } from "@/server/auth/guards";
import { normLabel } from "@/lib/norm-label";
import { getActionFeedContext } from "@/server/dal/action-feed";
import { listNorms } from "@/server/dal/norms";
import { listScheduleForStudent } from "@/server/dal/schedule";
import { listStudentApplications } from "@/server/dal/students";
import { getRetakeRule } from "@/server/dal/study";
import { buildActionFeed } from "@/server/rules/action-feed";
import { parseStages, statusTitle } from "@/server/rules/application-stages";
import { buildTodayView } from "@/server/rules/schedule";

export const metadata: Metadata = { title: "Главная" };

const DAY = 24 * 60 * 60 * 1000;
const CLOSED = new Set(["APPROVED", "REJECTED", "ORDER_SIGNED", "CANCELLED"]);

async function Today({ actor, now }: { actor: StudentActor; now: Date }) {
  // С запасом на выходные и праздники: следующий учебный день с парами.
  const schedule = await listScheduleForStudent(
    actor,
    new Date(now.getTime() - DAY),
    new Date(now.getTime() + 22 * DAY),
  );
  const view = buildTodayView(now, schedule.events, schedule.changes, schedule.calendar);
  return <TodayBlock view={view} retakeRule={await getRetakeRule(actor)} headingLevel={3} />;
}

async function Feed({ actor, now }: { actor: StudentActor; now: Date }) {
  const [ctx, norms] = await Promise.all([getActionFeedContext(actor, now), listNorms(actor)]);
  return (
    <ActionFeed
      items={ctx ? buildActionFeed(now, ctx) : []}
      normLabels={new Map(norms.map((n) => [n.code, normLabel(n)]))}
    />
  );
}

async function MyApplications({ actor }: { actor: StudentActor }) {
  const active = (await listStudentApplications(actor)).filter((a) => !CLOSED.has(a.status));
  if (active.length === 0) {
    return (
      <p className="text-ink-muted">
        Активных заявок нет.{" "}
        <Link
          href="/applications/new"
          className="text-accent inline-flex min-h-11 items-center underline"
        >
          Заказать справку
        </Link>
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2" data-testid="my-applications">
      {active.map((app) => (
        <li key={app.id}>
          <Link
            href={`/applications/${app.id}`}
            className="border-border hover:bg-surface-muted flex min-h-11 items-center justify-between gap-3 rounded-md border p-3"
          >
            <span>
              <span className="block font-medium">{app.type.title}</span>
              <span className="text-ink-muted block text-sm">
                {statusTitle(parseStages(app.type.stages), app.status, app.branch)}
                {app.stageDeadline
                  ? ` · следующий этап до ${formatDateKey(app.stageDeadline.toISOString().slice(0, 10))}`
                  : ""}
              </span>
            </span>
            <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function StudentHomePage() {
  const actor = await requireStudent();
  const now = new Date();
  return (
    <>
      <h1 className="sr-only">Главная</h1>
      <section aria-labelledby="today-title">
        <h2 id="today-title" className="text-xl font-semibold">
          Сегодня
        </h2>
        <div className="mt-2">
          <Suspense fallback={<SectionSkeleton label="Загружаем расписание" />}>
            <Today actor={actor} now={now} />
          </Suspense>
        </div>
      </section>
      <section aria-labelledby="todo-title" className="mt-8">
        <h2 id="todo-title" className="text-xl font-semibold">
          Нужно сделать
        </h2>
        <div className="mt-3">
          <Suspense fallback={<SectionSkeleton label="Загружаем задачи" />}>
            <Feed actor={actor} now={now} />
          </Suspense>
        </div>
      </section>
      <section aria-labelledby="apps-title" className="mt-8">
        <h2 id="apps-title" className="text-xl font-semibold">
          Мои заявки
        </h2>
        <div className="mt-3">
          <Suspense fallback={<SectionSkeleton label="Загружаем заявки" />}>
            <MyApplications actor={actor} />
          </Suspense>
        </div>
      </section>
    </>
  );
}
