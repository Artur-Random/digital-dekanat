import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ApplicationCard, stageNormCodes } from "@/components/ApplicationCard";
import { BackButton } from "@/components/BackButton";
import { PrototypeNote } from "@/components/NormChip";
import { NormQuotes } from "@/components/NormQuote";
import { StatusActions } from "@/components/forms/StatusActions";
import { TRANSITION_LABEL } from "@/lib/labels";
import { todayInMoscow } from "@/lib/moscow-date";
import { requireStaff } from "@/server/auth/guards";
import { getProductionCalendar, parseDocuments } from "@/server/dal/applications";
import { listNorms } from "@/server/dal/norms";
import { getUnitApplication } from "@/server/dal/staff";
import {
  allowedTransitions,
  findBranch,
  parseStages,
  statusTitle,
} from "@/server/rules/application-stages";

export const metadata: Metadata = { title: "Заявка" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// E2: данные заявления, этапы, история; кнопки только допустимых переходов (N-46 при отказе).
export default async function StaffApplicationPage({ params, searchParams }: Props) {
  const actor = await requireStaff();
  const { id } = await params;
  const app = await getUnitApplication(actor, id);
  if (!app) notFound();
  const stages = parseStages(app.type.stages);
  const transitions = allowedTransitions(findBranch(stages, app.branch), app.status);
  const canReject = transitions.some((t) => t.kind === "reject");
  // Мотивированный отказ — норма только для решения комиссии по академическому отпуску
  // (ветка Б, N-46, 754общ п. 2.14);
  // для остальных заявлений обязательная причина — решение прототипа.
  const rejectNorm =
    canReject && app.type.code === "ACADEMIC_LEAVE" && app.branch === "B" ? ["N-46"] : [];
  const [calendar, normRows] = await Promise.all([
    getProductionCalendar(actor),
    listNorms(actor, [...stageNormCodes(stages), ...rejectNorm]),
  ]);
  const norms = new Map(normRows.map((n) => [n.code, n]));
  const changed = (await searchParams).changed === "1";

  return (
    <div className="max-w-4xl">
      <BackButton fallbackHref="/staff" />
      <h1 className="mt-2 text-2xl font-semibold">{app.type.title}</h1>
      {changed ? (
        <p
          role="status"
          className="border-ok text-ok mt-3 rounded-md border p-3 font-medium"
          data-testid="changed-banner"
        >
          Статус изменён: {statusTitle(stages, app.status, app.branch)}. Студент получил
          уведомление.
        </p>
      ) : null}
      <section aria-labelledby="actions-title" className="border-border mt-4 rounded-md border p-3">
        <h2 id="actions-title" className="text-lg font-semibold">
          Действия
        </h2>
        {transitions.length === 0 ? (
          <p className="text-ink-muted mt-2" data-testid="no-actions">
            Заявка закрыта: действий нет.
          </p>
        ) : (
          <div className="mt-2">
            <StatusActions
              applicationId={app.id}
              transitions={transitions.map((t) => ({
                to: t.to,
                kind: t.kind,
                label:
                  t.to === "ORDER_SIGNED"
                    ? `Отметить: ${statusTitle(stages, t.to, app.branch)}`
                    : TRANSITION_LABEL[t.to],
              }))}
            />
            {canReject ? (
              <div className="mt-3 text-sm">
                <p className="text-ink-muted">Отказ без причины не сохранится.</p>
                {rejectNorm.length > 0 ? (
                  <NormQuotes codes={rejectNorm} norms={norms} />
                ) : (
                  <PrototypeNote />
                )}
              </div>
            ) : null}
          </div>
        )}
      </section>
      <ApplicationCard
        app={app}
        stages={stages}
        documents={parseDocuments(app.type.requiredDocuments)}
        norms={norms}
        calendar={calendar}
        today={todayInMoscow()}
        head={[
          {
            label: "Студент",
            value: `${app.student.fullName}, ${app.student.group.code}`,
            testId: "application-student",
          },
        ]}
        perspective="staff"
      />
    </div>
  );
}
