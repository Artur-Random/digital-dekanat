import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ApplicationCard, stageNormCodes } from "@/components/ApplicationCard";
import { BackButton } from "@/components/BackButton";
import { CancelApplicationButton } from "@/components/forms/CancelApplicationButton";
import { todayInMoscow } from "@/lib/moscow-date";
import { requireStudent } from "@/server/auth/guards";
import { getProductionCalendar, parseDocuments } from "@/server/dal/applications";
import { listNorms } from "@/server/dal/norms";
import { getStudentApplication } from "@/server/dal/students";
import { canStudentCancel, parseStages } from "@/server/rules/application-stages";

export const metadata: Metadata = { title: "Заявка" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// S4b: статус, данные заявления, этапы со сроками и нормами, история с комментариями, отмена.
export default async function StudentApplicationPage({ params, searchParams }: Props) {
  const actor = await requireStudent();
  const { id } = await params;
  const app = await getStudentApplication(actor, id);
  if (!app) notFound();
  const stages = parseStages(app.type.stages);
  const [calendar, normRows] = await Promise.all([
    getProductionCalendar(actor),
    listNorms(actor, stageNormCodes(stages)),
  ]);
  const created = (await searchParams).created === "1";

  return (
    <>
      <BackButton fallbackHref="/applications" />
      <h1 className="mt-2 text-2xl font-semibold">{app.type.title}</h1>
      {created ? (
        <p
          role="status"
          className="border-ok text-ok mt-3 rounded-md border p-3 font-medium"
          data-testid="created-banner"
        >
          Заявка подана. Статус и сроки — ниже, об изменениях придёт уведомление.
        </p>
      ) : null}
      <ApplicationCard
        app={app}
        stages={stages}
        documents={parseDocuments(app.type.requiredDocuments)}
        norms={new Map(normRows.map((n) => [n.code, n]))}
        calendar={calendar}
        today={todayInMoscow()}
        head={[{ label: "Обрабатывает", value: app.unit.name }]}
        perspective="student"
      />
      {canStudentCancel(app.status) ? (
        <section aria-label="Отмена заявки" className="mt-8">
          <p className="text-ink-muted text-sm">
            Отменить заявку можно, пока её не взяли в работу (так устроено в прототипе).
          </p>
          <CancelApplicationButton applicationId={app.id} />
        </section>
      ) : null}
    </>
  );
}
