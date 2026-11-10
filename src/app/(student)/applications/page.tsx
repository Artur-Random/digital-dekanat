import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { formatDay } from "@/lib/format-date";
import { parseStages, statusTitle } from "@/server/rules/application-stages";
import { requireStudent } from "@/server/auth/guards";
import { listStudentApplications } from "@/server/dal/students";

export const metadata: Metadata = { title: "Заявки и справки" };

// Минимальный список (полный экран S4 в следующих заданиях).
export default async function ApplicationsPage() {
  const actor = await requireStudent();
  const applications = await listStudentApplications(actor);

  return (
    <>
      <h1 className="text-2xl font-semibold">Заявки и справки</h1>
      {applications.length === 0 ? (
        <p className="text-ink-muted mt-4">
          Заявок пока нет. Здесь появятся справки и заявления, которые вы подадите.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {applications.map((app) => (
            <li key={app.id}>
              <Link
                href={`/applications/${app.id}`}
                className="border-border hover:bg-surface-muted flex min-h-11 items-center justify-between gap-3 rounded-md border p-3"
              >
                <span>
                  <span className="block font-medium">{app.type.title}</span>
                  <span className="text-ink-muted block text-sm">
                    {statusTitle(parseStages(app.type.stages), app.status)} · от{" "}
                    {formatDay(app.createdAt)}
                  </span>
                </span>
                <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
