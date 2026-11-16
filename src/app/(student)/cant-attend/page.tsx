import type { Metadata } from "next";
import { z } from "zod";

import { BackButton } from "@/components/BackButton";
import { NormQuotes } from "@/components/NormQuote";
import { AbsenceForm } from "@/components/forms/AbsenceForm";
import { formatDateKeySmart, formatDayTime } from "@/lib/format-date";
import { toDateKey } from "@/lib/moscow-date";
import { EVENT_TYPE_LABEL } from "@/lib/schedule-labels";
import { requireStudent } from "@/server/auth/guards";
import { getAbsenceContext, getApplicationTypeForStudent } from "@/server/dal/applications";
import { listNorms } from "@/server/dal/norms";
import { absenceNoticeDeadline } from "@/server/rules/application-forms";

export const metadata: Metadata = { title: "Не смогу прийти" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const eventParam = z.cuid();

// S5 «Не смогу прийти»: на выходе заявление о продлении срока аттестации в деканат (N-05).
// В лимит активных заявок не входит: срок по норме (N-04, N-16), решение Кирилла 16.11.
export default async function CantAttendPage({ searchParams }: Props) {
  const actor = await requireStudent();
  const [type, ctx] = await Promise.all([
    getApplicationTypeForStudent(actor, "PA_EXTENSION"),
    getAbsenceContext(actor),
  ]);
  const norms = new Map(
    (await listNorms(actor, ["N-04", "N-05", "N-06", "N-07", "N-16"])).map((n) => [n.code, n]),
  );
  const event = eventParam.safeParse((await searchParams).event);

  if (!type) {
    return (
      <>
        <BackButton fallbackHref="/study" />
        <h1 className="mt-2 text-2xl font-semibold">Не смогу прийти</h1>
        <p className="text-ink-muted mt-4">
          Для вашего уровня образования это заявление пока подаётся в текущем личном кабинете.
        </p>
      </>
    );
  }

  const candidates = ctx.candidates.map((c) => {
    const day = toDateKey(c.startsAt);
    const deadline = absenceNoticeDeadline(day, ctx.calendar);
    return {
      id: c.id,
      label: `${EVENT_TYPE_LABEL[c.type]}: ${c.discipline}`,
      when: formatDayTime(c.startsAt),
      day,
      notifyBy: formatDateKeySmart(deadline, ctx.today),
      expired: ctx.today > deadline,
    };
  });
  const reasons = type.requiredDocuments.flatMap((d) =>
    d.code && d.reason ? [{ code: d.code, reason: d.reason, document: d.title }] : [],
  );

  return (
    <>
      <BackButton fallbackHref="/study" />
      <h1 className="mt-2 text-2xl font-semibold">Не смогу прийти</h1>
      <p className="mt-2">
        Заявление о продлении срока аттестации по уважительной причине. Рассматривает:{" "}
        {type.unit.name.toLowerCase()}.
      </p>
      <NormQuotes codes={["N-05"]} norms={norms} />
      <AbsenceForm
        candidates={candidates}
        reasons={reasons}
        initialEventId={event.success ? event.data : null}
        deadlineNorms={<NormQuotes codes={["N-04", "N-16"]} norms={norms} />}
        documentNorms={<NormQuotes codes={["N-06"]} norms={norms} />}
        periodNorms={<NormQuotes codes={["N-07"]} norms={norms} />}
      />
    </>
  );
}
