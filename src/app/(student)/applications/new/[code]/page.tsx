import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { BackButton } from "@/components/BackButton";
import { NormQuotes } from "@/components/NormQuote";
import { StageTimeline } from "@/components/StageTimeline";
import { CertificateForm } from "@/components/forms/CertificateForm";
import { LeaveForm } from "@/components/forms/LeaveForm";
import { todayInMoscow } from "@/lib/moscow-date";
import { requireStudent } from "@/server/auth/guards";
import { ApplicationLimitNotice } from "@/components/ApplicationLimitNotice";
import { getApplicationLimitView, getApplicationTypeForStudent } from "@/server/dal/applications";
import { listNorms } from "@/server/dal/norms";
import { getDebts, getRulesForStudent } from "@/server/dal/study";
import { RuleText } from "@/components/RuleText";
import { leaveExpulsionWarning } from "@/server/rules/application-forms";
import { findBranch, stageTimeline } from "@/server/rules/application-stages";

export const metadata: Metadata = { title: "Новая заявка" };

type Props = { params: Promise<{ code: string }> };

const codeSchema = z.enum([
  "CERT_ENROLLMENT",
  "CERT_GRADES",
  "CERT_SUMMONS",
  "ACADEMIC_LEAVE",
  "PA_EXTENSION",
]);

// S4a, шаг 2: форма выбранного типа. Срок и подразделение показываются из данных типа.
export default async function NewApplicationFormPage({ params }: Props) {
  const actor = await requireStudent();
  const code = codeSchema.safeParse((await params).code);
  if (!code.success) notFound();
  if (code.data === "PA_EXTENSION") redirect("/cant-attend");
  const [type, limit, debts, rules] = await Promise.all([
    getApplicationTypeForStudent(actor, code.data),
    getApplicationLimitView(actor),
    getDebts(actor),
    getRulesForStudent(actor),
  ]);
  if (!type || type.isInformational) notFound();
  if (limit.reached) {
    return (
      <>
        <BackButton fallbackHref="/applications" />
        <h1 className="mt-2 text-2xl font-semibold">{type.title}</h1>
        <ApplicationLimitNotice text={limit.text} showLink />
      </>
    );
  }

  const today = todayInMoscow();
  const basisCodes = type.stages.flatMap((b) =>
    b.stages.flatMap((s) => (s.basis?.kind === "NORM" ? [s.basis.code] : [])),
  );
  const isLeave = type.code === "ACADEMIC_LEAVE";
  // N-49: заявление на отпуск не отменяет отчисление — показываем до отправки при долге этапа II.
  const noStay =
    isLeave && leaveExpulsionWarning(debts)
      ? rules.find((r) => r.trigger === "ACADEMIC_LEAVE_NO_STAY")
      : undefined;
  // Основания и сроки отпуска (N-40, N-41) и личное заявление (N-42) — над формой.
  const introCodes = isLeave ? ["N-40", "N-41", "N-42"] : [];
  const warningCodes = noStay?.normCodes ?? [];
  const norms = new Map(
    (await listNorms(actor, [...basisCodes, ...introCodes, ...warningCodes])).map((n) => [
      n.code,
      n,
    ]),
  );
  const preview = (branchCode: string) => {
    const branch = findBranch(type.stages, branchCode);
    return branch ? (
      <>
        <p className="font-medium">{branch.title}: этапы и сроки</p>
        <div className="mt-2">
          <StageTimeline
            entries={stageTimeline(branch, null, type.calendar)}
            norms={norms}
            today={today}
            testId={`preview-${branchCode}`}
          />
        </div>
      </>
    ) : null;
  };

  return (
    <>
      <BackButton fallbackHref="/applications/new" />
      <h1 className="mt-2 text-2xl font-semibold">{type.title}</h1>
      <p className="text-ink-muted mt-2">Обрабатывает: {type.unit.name}</p>
      {isLeave ? (
        <>
          <p className="mt-3">Основания, сроки и порядок подачи — в пунктах положения:</p>
          <NormQuotes codes={introCodes} norms={norms} />
          <LeaveForm
            previews={{ A: preview("A"), B: preview("B") }}
            warning={
              noStay ? (
                <div
                  role="note"
                  className="border-danger rounded-md border-2 p-3"
                  data-testid="leave-no-stay"
                >
                  <p className="font-semibold">{noStay.title}</p>
                  <RuleText
                    text={noStay.body}
                    normCodes={noStay.normCodes}
                    norms={norms}
                    prototypeAssumption={noStay.prototypeAssumption}
                  />
                </div>
              ) : undefined
            }
          />
        </>
      ) : (
        <>
          <div className="border-border mt-4 rounded-md border p-3">{preview("MAIN")}</div>
          <CertificateForm typeCode={type.code} />
        </>
      )}
    </>
  );
}
