import type { ApplicationStatus } from "@/generated/prisma/enums";
import { formatDateOnly, formatDay } from "@/lib/format-date";
import { toDateKey } from "@/lib/moscow-date";
import type { NormView } from "@/server/dal/norms";
import { describeFormData } from "@/server/rules/application-data";
import {
  type StageBranch,
  findBranch,
  stageTimeline,
  statusTitle,
} from "@/server/rules/application-stages";
import type { ProductionCalendar } from "@/server/rules/working-days";

import { ApplicationHistory } from "./ApplicationHistory";
import { StageTimeline } from "./StageTimeline";

export type ApplicationCardData = {
  status: ApplicationStatus;
  branch: string;
  createdAt: Date;
  stageDeadline: Date | null;
  willBringOriginal: boolean;
  formData: unknown;
  type: { code: string };
  events: {
    id: string;
    fromStatus: ApplicationStatus | null;
    toStatus: ApplicationStatus;
    comment: string | null;
    createdAt: Date;
  }[];
};

/** Общая часть карточки заявки для студента (S4b) и сотрудника (E2). */
export function ApplicationCard({
  app,
  stages,
  documents,
  norms,
  calendar,
  today,
  head,
  perspective,
}: {
  app: ApplicationCardData;
  stages: StageBranch[];
  documents: readonly { code?: string; reason?: string; title: string }[];
  norms: ReadonlyMap<string, NormView>;
  calendar: ProductionCalendar;
  today: string;
  /** Строки над статусом: студент видит подразделение, сотрудник — студента. */
  head: { label: string; value: string; testId?: string }[];
  perspective: "student" | "staff";
}) {
  const branch = findBranch(stages, app.branch);
  const rows = describeFormData(app.type.code, app.formData, documents);
  const timeline = branch
    ? stageTimeline(
        branch,
        { current: app.status, events: app.events, submitted: toDateKey(app.createdAt) },
        calendar,
        statusTitle(stages, app.status, app.branch),
      )
    : [];
  return (
    <>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        {head.map((h) => (
          <div key={h.label} className="contents">
            <dt className="text-ink-muted">{h.label}</dt>
            <dd data-testid={h.testId}>{h.value}</dd>
          </div>
        ))}
        <dt className="text-ink-muted">Статус</dt>
        <dd className="font-medium" data-testid="application-status">
          {statusTitle(stages, app.status, app.branch)}
        </dd>
        <dt className="text-ink-muted">Подано</dt>
        <dd>{formatDay(app.createdAt)}</dd>
        {app.stageDeadline ? (
          <>
            <dt className="text-ink-muted">Срок этапа</dt>
            <dd data-testid="stage-deadline">до {formatDateOnly(app.stageDeadline)}</dd>
          </>
        ) : null}
        {rows.map((r) => (
          <div key={r.label} className="contents">
            <dt className="text-ink-muted">{r.label}</dt>
            <dd className="[overflow-wrap:anywhere]">{r.value}</dd>
          </div>
        ))}
        {app.willBringOriginal ? (
          <>
            <dt className="text-ink-muted">Оригинал</dt>
            <dd>
              {perspective === "student"
                ? "Оригинал документа принесу"
                : "Студент принесёт оригинал"}
            </dd>
          </>
        ) : null}
      </dl>
      {timeline.length > 0 ? (
        <section aria-labelledby="stages-title" className="mt-8">
          <h2 id="stages-title" className="text-lg font-semibold">
            Этапы и сроки
          </h2>
          <div className="mt-3">
            <StageTimeline entries={timeline} norms={norms} today={today} />
          </div>
        </section>
      ) : null}
      <section aria-labelledby="history-title" className="mt-8">
        <h2 id="history-title" className="text-lg font-semibold">
          История и комментарии
        </h2>
        <div className="mt-3">
          <ApplicationHistory events={app.events} stages={stages} branch={app.branch} />
        </div>
      </section>
    </>
  );
}

/** Коды норм этапов ветки: их цитаты нужны таймлайну. */
export function stageNormCodes(stages: StageBranch[]): string[] {
  return [
    ...new Set(
      stages.flatMap((b) =>
        b.stages.flatMap((s) => (s.basis?.kind === "NORM" ? [s.basis.code] : [])),
      ),
    ),
  ];
}
