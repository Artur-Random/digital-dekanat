import { AlertTriangle, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";

import { NormQuotes } from "@/components/NormQuote";
import { RuleText } from "@/components/RuleText";
import { SectionSkeleton } from "@/components/SectionSkeleton";
import { formatDateKeySmart, formatDayTime } from "@/lib/format-date";
import { monthPrepositional } from "@/lib/months";
import { toDateKey } from "@/lib/moscow-date";
import { type StudentActor, requireStudent } from "@/server/auth/guards";
import { listNorms } from "@/server/dal/norms";
import { getDebts, getStipendContext, listAssessments, listSemesters } from "@/server/dal/study";
import { CONTROL_FORM_LABEL, GRADE_LABEL, gradeFor } from "@/server/rules/grades";
import { renderRule } from "@/server/rules/rule-text";
import { stipendStatus } from "@/server/rules/stipend";

export const metadata: Metadata = { title: "Учёба" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// Номер семестра из адреса. Некорректное значение — семестр по умолчанию, а не ошибка.
const semesterParam = z.coerce.number().int().min(1).max(12);

export default async function StudyPage({ searchParams }: Props) {
  const actor = await requireStudent();
  const params = await searchParams;
  const semesters = await listSemesters(actor);
  const parsed = semesterParam.safeParse(params.semester);
  // По умолчанию последний семестр с результатами, а если результатов нет — текущий.
  const fallback =
    [...semesters].reverse().find((s) => s.hasResults)?.semester ?? semesters.at(-1)?.semester;
  const selected =
    parsed.success && semesters.some((s) => s.semester === parsed.data) ? parsed.data : fallback;

  return (
    <>
      <h1 className="text-2xl font-semibold">Учёба</h1>
      <section aria-labelledby="summary-title" className="mt-4">
        <h2 id="summary-title" className="text-xl font-semibold">
          Как у меня дела
        </h2>
        <div className="mt-3">
          <Suspense fallback={<SectionSkeleton label="Загружаем сводку" />}>
            <Summary actor={actor} />
          </Suspense>
        </div>
      </section>
      <section aria-labelledby="results-title" className="mt-8">
        <h2 id="results-title" className="text-xl font-semibold">
          Дисциплины
        </h2>
        {semesters.length === 0 || selected === undefined ? (
          <p className="text-ink-muted mt-3">Дисциплин пока нет: учебный план ещё не загружен.</p>
        ) : (
          <>
            <nav aria-label="Семестры" className="mt-3 flex flex-wrap gap-2">
              {semesters.map((s) => (
                <Link
                  key={s.semester}
                  href={`/study?semester=${s.semester}`}
                  aria-current={s.semester === selected ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center rounded-md px-4 font-medium ${
                    s.semester === selected
                      ? "bg-accent text-accent-ink"
                      : "border-ink-muted border"
                  }`}
                >
                  {s.semester} семестр
                </Link>
              ))}
            </nav>
            <div className="mt-4">
              <Suspense fallback={<SectionSkeleton label="Загружаем дисциплины" />}>
                <Semester
                  actor={actor}
                  semester={selected}
                  anyResults={semesters.some((s) => s.hasResults)}
                />
              </Suspense>
            </div>
          </>
        )}
      </section>
    </>
  );
}

async function Summary({ actor }: { actor: StudentActor }) {
  const now = new Date();
  const [debts, ctx] = await Promise.all([getDebts(actor), getStipendContext(actor)]);
  const status = ctx ? stipendStatus(ctx.student, ctx.assessments, ctx.debts, now) : null;
  const rule = (trigger: string) => ctx?.rules.find((r) => r.trigger === trigger) ?? null;
  const stipendRule = status ? rule(status.paid ? "STIPEND_PAID" : "STIPEND_STOPPED") : null;
  const windowRule = status ? rule("RAISED_STIPEND_WINDOW") : null;
  const codes = ["N-10", ...(stipendRule?.normCodes ?? []), ...(windowRule?.normCodes ?? [])];
  const norms = new Map((await listNorms(actor, codes)).map((n) => [n.code, n]));
  const nearest = debts[0];

  return (
    <div className="flex flex-col gap-3">
      <div
        data-testid="debts-summary"
        className={`rounded-md border p-3 ${debts.length > 0 ? "border-danger" : "border-border"}`}
      >
        {debts.length === 0 ? (
          <p>Академических задолженностей нет.</p>
        ) : (
          <>
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle aria-hidden="true" className="text-danger size-5 shrink-0" />
              Академических задолженностей: {debts.length}
            </p>
            {nearest?.assessmentId ? (
              <Link
                href={`/study/${nearest.assessmentId}`}
                className="text-accent mt-1 flex min-h-11 items-center gap-1 underline"
              >
                {nearest.discipline.name}: ликвидировать до{" "}
                {formatDateKeySmart(nearest.deadline, toDateKey(now))}
                <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
              </Link>
            ) : null}
            {nearest?.assessmentId ? (
              <Link
                href={`/study/${nearest.assessmentId}`}
                data-testid="debt-what-if"
                className="bg-accent text-accent-ink mt-2 inline-flex min-h-11 items-center gap-1 rounded-md px-4 font-medium"
              >
                Что будет, если…
                <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
              </Link>
            ) : null}
            <NormQuotes codes={["N-10"]} norms={norms} />
          </>
        )}
      </div>
      {status && stipendRule ? (
        <div className="border-border rounded-md border p-3" data-testid="stipend-summary">
          <h3 className="font-semibold">Стипендия</h3>
          <div className="mt-1">
            <RuleText
              testId="stipend-status"
              text={renderRule(stipendRule.body, {
                stopDate: status.stoppedFrom
                  ? formatDateKeySmart(status.stoppedFrom, toDateKey(now))
                  : "",
                reason:
                  status.reason === "debt"
                    ? "академическая задолженность"
                    : "оценка «удовлетворительно»",
              })}
              normCodes={stipendRule.normCodes}
              norms={norms}
            />
          </div>
          {windowRule ? (
            <div className="text-ink-muted mt-3 text-sm">
              <RuleText
                testId="raised-window"
                text={renderRule(windowRule.body, {
                  opens: formatDateKeySmart(status.raisedWindow.opens, toDateKey(now)),
                  closes: formatDateKeySmart(status.raisedWindow.closes, toDateKey(now)),
                })}
                normCodes={windowRule.normCodes}
                norms={norms}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

async function Semester({
  actor,
  semester,
  anyResults,
}: {
  actor: StudentActor;
  semester: number;
  anyResults: boolean;
}) {
  const { rows, bands } = await listAssessments(actor, semester);
  if (rows.length === 0) {
    return <p className="text-ink-muted">В этом семестре дисциплин нет.</p>;
  }
  const first = rows[0];
  return (
    <>
      {!anyResults && first ? (
        <p className="mb-3 font-medium" data-testid="no-results">
          Результатов пока нет: первая сессия в {monthPrepositional(toDateKey(first.date))}
        </p>
      ) : null}
      <ul className="flex flex-col gap-2" data-testid="disciplines">
        {rows.map((a) => {
          const result =
            a.score === null ? null : gradeFor(a.score, a.controlForm, actor.levelCode, bands);
          const isDebt = result !== null && !result.isPositive;
          // Вход в S3a «Что будет, если…» заметен там, где есть последствия: долг, тройка,
          // контроль ещё впереди (замечание Максима, #34).
          const whatIf = isDebt || result === null || result.grade === "SATISFACTORY";
          return (
            <li key={a.id}>
              <Link
                href={`/study/${a.id}`}
                data-testid="discipline"
                data-debt={isDebt ? "true" : "false"}
                className={`hover:bg-surface-muted flex min-h-11 items-center justify-between gap-3 rounded-md border p-3 ${
                  isDebt ? "border-danger border-l-4" : "border-border"
                }`}
              >
                <span>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{a.discipline.name}</span>
                    {isDebt ? (
                      <span className="text-danger border-danger rounded border px-2 py-0.5 text-sm font-semibold">
                        Задолженность
                      </span>
                    ) : null}
                  </span>
                  <span className="text-ink-muted block text-sm">
                    {CONTROL_FORM_LABEL[a.controlForm]}
                    {result && a.score !== null
                      ? ` · ${a.score} баллов · ${GRADE_LABEL[result.grade]}`
                      : ` · ${formatDayTime(a.date)}`}
                    {a.attempt > 0 ? ` · пересдача, попытка ${a.attempt}` : ""}
                  </span>
                  {whatIf ? (
                    <span
                      className="text-accent mt-1 block font-medium"
                      data-testid="what-if-entry"
                    >
                      Что будет, если…
                    </span>
                  ) : null}
                </span>
                <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
