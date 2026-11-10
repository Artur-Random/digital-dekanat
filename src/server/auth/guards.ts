import "server-only";

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import type { EducationLevelCode, Funding } from "@/generated/prisma/client";
import { safeNextPath } from "@/lib/safe-next";

import { type SessionUser, getSessionUser } from "./session";

// Совпадает с CURRENT_PATH_HEADER в src/proxy.ts.
const CURRENT_PATH_HEADER = "x-dd-current-path";

export type StudentActor = {
  userId: string;
  studentId: string;
  levelCode: EducationLevelCode;
  funding: Funding;
};

export type StaffActor = { userId: string; staffId: string; unitId: string };

async function loginRedirect(): Promise<never> {
  const store = await headers();
  const next = safeNextPath(store.get(CURRENT_PATH_HEADER));
  redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
}

/** Любой вошедший пользователь. Аноним уходит на /login?next=<текущий путь>. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) return loginRedirect();
  return user;
}

/** Студент. Сотрудник получает 404, а не 403: не подтверждаем, что страница существует. */
export async function requireStudent(): Promise<StudentActor> {
  const user = await requireUser();
  if (user.role !== "STUDENT" || !user.student) notFound();
  return { userId: user.userId, ...user.student };
}

/** Сотрудник подразделения. Студент получает 404. */
export async function requireStaff(): Promise<StaffActor> {
  const user = await requireUser();
  if (user.role !== "STAFF" || !user.staff) notFound();
  return { userId: user.userId, ...user.staff };
}
