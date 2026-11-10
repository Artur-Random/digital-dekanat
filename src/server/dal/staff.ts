import "server-only";

import { z } from "zod";

import type { StaffActor } from "@/server/auth/guards";
import { getDb } from "@/server/db";

// Все функции фильтруют по actor.unitId из сессии: сотрудник видит только заявки
// своего подразделения. Чужая запись даёт null, страница отвечает notFound().

const idSchema = z.cuid();

export async function getStaffProfile(actor: StaffActor) {
  return getDb().staffProfile.findUnique({
    where: { id: actor.staffId },
    select: { fullName: true, position: true, unit: { select: { name: true } } },
  });
}

export async function listUnitApplications(actor: StaffActor) {
  return getDb().application.findMany({
    where: { unitId: actor.unitId },
    orderBy: [{ stageDeadline: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    select: {
      id: true,
      status: true,
      createdAt: true,
      stageDeadline: true,
      type: { select: { title: true, stages: true } },
      student: { select: { fullName: true, group: { select: { code: true } } } },
    },
  });
}

export async function getUnitApplication(actor: StaffActor, id: string) {
  if (!idSchema.safeParse(id).success) return null;
  return getDb().application.findFirst({
    where: { id, unitId: actor.unitId },
    select: {
      id: true,
      status: true,
      createdAt: true,
      stageDeadline: true,
      willBringOriginal: true,
      type: { select: { title: true, stages: true } },
      student: { select: { fullName: true, group: { select: { code: true } } } },
      events: {
        orderBy: { createdAt: "asc" },
        select: { id: true, fromStatus: true, toStatus: true, comment: true, createdAt: true },
      },
    },
  });
}
