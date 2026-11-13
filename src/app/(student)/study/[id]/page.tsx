import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BackButton } from "@/components/BackButton";
import { NormQuotes } from "@/components/NormQuote";
import { RuleText } from "@/components/RuleText";
import { formatDateKeySmart, formatDayTime } from "@/lib/format-date";
import { toDateKey } from "@/lib/moscow-date";
import { requireStudent } from "@/server/auth/guards";
import { listNorms } from "@/server/dal/norms";
import { getDisciplineView, getStipendContext } from "@/server/dal/study";
import { debtTimeline } from "@/server/rules/debts";
import { CONTROL_FORM_LABEL, GRADE_LABEL, gradeFor } from "@/server/rules/grades";
import { stipendStatus } from "@/server/rules/stipend";
import { whatIfScenarios } from "@/server/rules/what-if";

export const metadata: Metadata = { title: "Дисциплина" };

type Props = { params: Promise<{ id: string }> };

// S3a «Что будет, если…». Без loading.tsx: в сегменте с [id] и notFound() он давал 200 вместо 404.
export default async function DisciplinePage({ params }: Props) {
  const actor = await requireStudent();
  const { id } = await params;
  const view = await getDisciplineView(actor, id);
  if (!view) notFound();
  const stipendCtx = await getStipendContext(actor);

  const now = new Date();
  const { assessment: a } = view;
  const stipend = stipendCtx
    ? stipendStatus(stipendCtx.student, stipendCtx.assessments, stipendCtx.debts, now)
    : null;
  const result =
    a.score === null ? null : gradeFor(a.score, a.controlForm, actor.levelCode, view.bands);
  const timeline = view.debt
    ? debtTimeline(
        { formedAt: view.debt.formedAt, stage: view.debt.stage },
        view.attemptsUsed,
        now,
        view.retakes,
      )
    : null;
  const scenarios = whatIfScenarios({
    now,
    calendar: view.calendar,
    student: view.student,
    discipline: a.discipline.name,
    assessment: { controlForm: a.controlForm, grade: a.grade, date: a.date },
    debt:
      view.debt && timeline
        ? {
            formedAt: view.debt.formedAt,
            afterAnnualSession: view.debt.afterAnnualSession,
            timeline,
          }
        : null,
    rules: view.rules,
    stipendStopped: stipend !== null && !stipend.paid,
  });
  const timelineCodes = timeline ? ["N-09", "N-10", "N-17", "N-52"] : [];
  const resultCodes = result ? ["N-02", "N-03", ...(result.isPositive ? [] : ["N-08"])] : [];
  const today = toDateKey(now);
  const ruleTitle = (trigger: string) => view.rules.find((r) => r.trigger === trigger)?.title ?? "";
  const codes = [
    ...new Set([
      ...timelineCodes,
      ...resultCodes,
      ...scenarios.flatMap((s) => s.items.flatMap((i) => i.normCodes)),
    ]),
  ];
  const norms = new Map((await listNorms(actor, codes)).map((n) => [n.code, n]));

  return (
    <>
      <BackButton fallbackHref="/study" />
      <h1 className="mt-2 text-2xl font-semibold">{a.discipline.name}</h1>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-ink-muted">Контроль</dt>
        <dd>
          {CONTROL_FORM_LABEL[a.controlForm]}, {a.semester} семестр
        </dd>
        {result && a.score !== null ? (
          <>
            <dt className="text-ink-muted">Результат</dt>
            <dd data-testid="result">
              {a.score} баллов, {GRADE_LABEL[result.grade]}
              {result.isPositive ? "" : " — академическая задолженность"}
            </dd>
          </>
        ) : (
          <>
            <dt className="text-ink-muted">Дата</dt>
            <dd data-testid="control-date">{formatDayTime(a.date)}</dd>
          </>
        )}
      </dl>
      {result ? <NormQuotes codes={resultCodes} norms={norms} /> : null}

      {timeline ? (
        <section aria-labelledby="timeline-title" className="mt-6" data-testid="debt-timeline">
          <h2 id="timeline-title" className="text-xl font-semibold">
            Шкала задолженности
          </h2>
          <ol className="mt-3 grid gap-2 sm:grid-cols-3">
            {/* Названия шагов — заголовки правил из таблицы Rule; даты — факты студента. */}
            {[
              {
                key: "STAGE_1",
                title: ruleTitle("DEBT_STAGE_1"),
                detail: timeline.nextRetake
                  ? `Пересдача: ${formatDayTime(timeline.nextRetake.startsAt)}`
                  : null,
              },
              { key: "STAGE_2", title: ruleTitle("DEBT_STAGE_2"), detail: null },
              {
                key: "EXPULSION",
                title: ruleTitle("DEBT_NOT_LIQUIDATED"),
                detail: `Крайний срок: ${formatDateKeySmart(timeline.deadline, today)}`,
              },
            ].map((step, index, steps) => {
              const current = step.key === timeline.stage;
              const passed = index < steps.findIndex((s) => s.key === timeline.stage);
              return (
                <li
                  key={step.key}
                  data-step={step.key}
                  aria-current={current ? "step" : undefined}
                  className={`rounded-md border p-3 ${current ? "border-accent border-2" : "border-border"}`}
                >
                  <p className="font-semibold">
                    {step.title}
                    {current ? <span className="text-accent"> · сейчас</span> : null}
                    {passed ? <span className="text-ink-muted"> · пройден</span> : null}
                  </p>
                  {step.detail ? <p className="text-ink-muted text-sm">{step.detail}</p> : null}
                </li>
              );
            })}
          </ol>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1" data-testid="debt-facts">
            <dt className="text-ink-muted">Попытка</dt>
            <dd data-testid="attempt">
              {timeline.nextAttempt ? `${timeline.nextAttempt} из 2` : "попыток не осталось"}
            </dd>
            <dt className="text-ink-muted">Крайний срок</dt>
            <dd data-testid="deadline">{formatDateKeySmart(timeline.deadline, today)}</dd>
            {timeline.nextRetake ? (
              <>
                <dt className="text-ink-muted">Пересдача</dt>
                <dd data-testid="retake-date">{formatDayTime(timeline.nextRetake.startsAt)}</dd>
              </>
            ) : null}
          </dl>
          <NormQuotes codes={timelineCodes} norms={norms} />
        </section>
      ) : null}

      {scenarios.length === 0 ? (
        <p className="text-ink-muted mt-6">
          {result?.isPositive
            ? "Дисциплина сдана, дополнительных действий не нужно."
            : "Для этой дисциплины сценариев пока нет."}
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {scenarios.map((s) => (
            <section
              key={s.id}
              aria-labelledby={`sc-${s.id}`}
              data-testid="scenario"
              data-scenario={s.id}
            >
              <h2 id={`sc-${s.id}`} className="text-lg font-semibold">
                {s.title}
              </h2>
              <ul className="mt-2 flex flex-col gap-3">
                {s.items.map((item) => (
                  <li
                    key={item.trigger}
                    className="border-border rounded-md border p-3"
                    data-trigger={item.trigger}
                  >
                    <RuleText
                      text={item.text}
                      normCodes={item.normCodes}
                      norms={norms}
                      prototypeAssumption={item.prototypeAssumption}
                    />
                  </li>
                ))}
              </ul>
              {s.actions.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {s.actions.map((action) => (
                    <Link
                      key={action.href}
                      href={action.href}
                      className="border-accent text-accent inline-flex min-h-11 items-center rounded-md border px-4 font-medium"
                    >
                      {action.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
