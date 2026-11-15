import "server-only";

import { z } from "zod";

import type { StudentActor } from "@/server/auth/guards";
import { getDb } from "@/server/db";

// Все функции фильтруют по actor.studentId из сессии. Чужая запись даёт null,
// страница отвечает notFound().

const idSchema = z.cuid();

export async function getStudentProfile(actor: StudentActor) {
  return getDb().studentProfile.findUnique({
    where: { id: actor.studentId },
    select: {
      fullName: true,
      institute: true,
      programCode: true,
      programName: true,
      profile: true,
      studyForm: true,
      funding: true,
      course: true,
      level: { select: { name: true } },
      group: { select: { code: true } },
    },
  });
}

export async function listStudentApplications(actor: StudentActor) {
  return getDb().application.findMany({
    where: { studentId: actor.studentId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      branch: true,
      createdAt: true,
      stageDeadline: true,
      type: { select: { title: true, stages: true } },
      unit: { select: { name: true } },
    },
  });
}

export async function getStudentApplication(actor: StudentActor, id: string) {
  if (!idSchema.safeParse(id).success) return null;
  return getDb().application.findFirst({
    where: { id, studentId: actor.studentId },
    select: {
      id: true,
      status: true,
      branch: true,
      createdAt: true,
      stageDeadline: true,
      willBringOriginal: true,
      formData: true,
      type: { select: { title: true, code: true, stages: true, requiredDocuments: true } },
      unit: { select: { name: true } },
      events: {
        orderBy: { createdAt: "asc" },
        select: { id: true, fromStatus: true, toStatus: true, comment: true, createdAt: true },
      },
    },
  });
}
