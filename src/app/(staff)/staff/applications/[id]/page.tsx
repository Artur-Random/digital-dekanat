import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ApplicationHistory } from "@/components/ApplicationHistory";
import { formatDateOnly, formatDay } from "@/lib/format-date";
import { APPLICATION_STATUS_LABEL } from "@/lib/labels";
import { requireStaff } from "@/server/auth/guards";
import { getUnitApplication } from "@/server/dal/staff";

export const metadata: Metadata = { title: "Заявка" };

type Props = { params: Promise<{ id: string }> };

// Минимальная E2: без смены статусов.
export default async function StaffApplicationPage({ params }: Props) {
  const actor = await requireStaff();
  const { id } = await params;
  const app = await getUnitApplication(actor, id);
  if (!app) notFound();

  return (
    <>
      <p className="text-sm">
        <Link href="/staff" className="text-accent underline">
          Очередь
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{app.type.title}</h1>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        <dt className="text-ink-muted">Студент</dt>
        <dd data-testid="application-student">
          {app.student.fullName}, {app.student.group.code}
        </dd>
        <dt className="text-ink-muted">Статус</dt>
        <dd className="font-medium" data-testid="application-status">
          {APPLICATION_STATUS_LABEL[app.status]}
        </dd>
        <dt className="text-ink-muted">Поступило</dt>
        <dd>{formatDay(app.createdAt)}</dd>
        {app.stageDeadline ? (
          <>
            <dt className="text-ink-muted">Срок этапа</dt>
            <dd>до {formatDateOnly(app.stageDeadline)}</dd>
          </>
        ) : null}
        {app.willBringOriginal ? (
          <>
            <dt className="text-ink-muted">Документ</dt>
            <dd>Студент принесёт оригинал</dd>
          </>
        ) : null}
      </dl>
      <h2 className="mt-8 text-lg font-semibold">История</h2>
      <div className="mt-3">
        <ApplicationHistory events={app.events} />
      </div>
    </>
  );
}
