import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ApplicationHistory } from "@/components/ApplicationHistory";
import { formatDay } from "@/lib/format-date";
import { parseStages, statusTitle } from "@/server/rules/application-stages";
import { requireStudent } from "@/server/auth/guards";
import { getStudentApplication } from "@/server/dal/students";

export const metadata: Metadata = { title: "Заявка" };

type Props = { params: Promise<{ id: string }> };

// Минимальная S4b: тип, статус, история. Таймлайн этапов со сроками появится позже.
export default async function StudentApplicationPage({ params }: Props) {
  const actor = await requireStudent();
  const { id } = await params;
  const app = await getStudentApplication(actor, id);
  if (!app) notFound();
  const stages = parseStages(app.type.stages);

  return (
    <>
      <p>
        <Link
          href="/applications"
          className="text-accent inline-flex min-h-11 items-center underline"
        >
          Все заявки
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{app.type.title}</h1>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        <dt className="text-ink-muted">Статус</dt>
        <dd className="font-medium" data-testid="application-status">
          {statusTitle(stages, app.status, app.branch)}
        </dd>
        <dt className="text-ink-muted">Обрабатывает</dt>
        <dd>{app.unit.name}</dd>
        <dt className="text-ink-muted">Подано</dt>
        <dd>{formatDay(app.createdAt)}</dd>
        {app.willBringOriginal ? (
          <>
            <dt className="text-ink-muted">Документ</dt>
            <dd>Оригинал документа принесу</dd>
          </>
        ) : null}
      </dl>
      <h2 className="mt-8 text-lg font-semibold">История</h2>
      <div className="mt-3">
        <ApplicationHistory events={app.events} stages={stages} branch={app.branch} />
      </div>
    </>
  );
}
