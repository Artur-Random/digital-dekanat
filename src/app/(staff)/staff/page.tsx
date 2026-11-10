import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { formatDay } from "@/lib/format-date";
import { parseStages, statusTitle } from "@/server/rules/application-stages";
import { requireStaff } from "@/server/auth/guards";
import { listUnitApplications } from "@/server/dal/staff";

export const metadata: Metadata = { title: "Очередь" };

// Минимальная E1: заявки своего подразделения. Таймеры и фильтры появятся позже.
export default async function StaffQueuePage() {
  const actor = await requireStaff();
  const applications = await listUnitApplications(actor);

  return (
    <>
      <h1 className="text-2xl font-semibold">Очередь заявок</h1>
      {applications.length === 0 ? (
        <p className="text-ink-muted mt-4">В очереди подразделения заявок нет.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {applications.map((app) => (
            <li key={app.id}>
              <Link
                href={`/staff/applications/${app.id}`}
                className="border-border hover:bg-surface-muted flex min-h-11 items-center justify-between gap-3 rounded-md border p-3"
              >
                <span>
                  <span className="block font-medium">{app.type.title}</span>
                  <span className="block">
                    {app.student.fullName}, {app.student.group.code}
                  </span>
                  <span className="text-ink-muted block text-sm">
                    Статус: {statusTitle(parseStages(app.type.stages), app.status).toLowerCase()} ·
                    поступило {formatDay(app.createdAt)}
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
