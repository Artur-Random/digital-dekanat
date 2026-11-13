import "server-only";

import type { StudentActor } from "@/server/auth/guards";
import { getDb } from "@/server/db";
import type { ActionFeedContext } from "@/server/rules/action-feed";
import { parseStages } from "@/server/rules/application-stages";

import { listScheduleForStudent } from "./schedule";
import { getDebts } from "./study";

/** Горизонт событий для ленты: пересдачи на 14 дней вперёд и изменения на 2 учебных дня. */
const FEED_HORIZON_DAYS = 22;

/** Данные для ленты «Нужно сделать»: только записи студента из сессии. */
export async function getActionFeedContext(
  actor: StudentActor,
  now: Date,
): Promise<ActionFeedContext | null> {
  const db = getDb();
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + FEED_HORIZON_DAYS * 24 * 60 * 60 * 1000);
  const [profile, schedule, applications, debts] = await Promise.all([
    db.studentProfile.findUnique({
      where: { id: actor.studentId },
      select: { studyForm: true, funding: true },
    }),
    listScheduleForStudent(actor, from, to),
    db.application.findMany({
      where: { studentId: actor.studentId, status: { not: "CANCELLED" } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        branch: true,
        stageDeadline: true,
        unit: { select: { name: true } },
        type: { select: { code: true, title: true, stages: true } },
      },
    }),
    getDebts(actor),
  ]);
  if (!profile) return null;
  return {
    calendar: schedule.calendar,
    student: profile,
    events: schedule.events,
    changes: schedule.changes,
    applications: applications.map((a) => ({
      id: a.id,
      typeCode: a.type.code,
      title: a.type.title,
      status: a.status,
      branch: a.branch,
      stageDeadline: a.stageDeadline,
      stages: parseStages(a.type.stages),
      unitName: a.unit.name,
    })),
    debts: debts.flatMap((d) =>
      d.assessmentId
        ? [
            {
              assessmentId: d.assessmentId,
              discipline: d.discipline.name,
              stage: d.stage,
              deadline: d.deadline,
            },
          ]
        : [],
    ),
  };
}
