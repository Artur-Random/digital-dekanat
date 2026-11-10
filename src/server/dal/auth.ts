import "server-only";

import { getDb } from "@/server/db";

// Доступ к данным для входа и сессий. Здесь нет actor: функции работают до того,
// как пользователь установлен, и вызываются только из src/server/auth.

export async function findUserForLogin(login: string) {
  return getDb().user.findUnique({
    where: { login },
    select: { id: true, passwordHash: true, role: true },
  });
}

export async function recordLoginAttempt(login: string, success: boolean): Promise<void> {
  await getDb().loginAttempt.create({ data: { login, success } });
}

/** Неудачные попытки в окне после последнего успешного входа, от старых к новым. */
export async function listRecentFailedAttempts(login: string, since: Date): Promise<Date[]> {
  const db = getDb();
  const lastSuccess = await db.loginAttempt.findFirst({
    where: { login, success: true, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const from = lastSuccess && lastSuccess.createdAt > since ? lastSuccess.createdAt : since;
  const rows = await db.loginAttempt.findMany({
    where: { login, success: false, createdAt: { gt: from } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  return rows.map((r) => r.createdAt);
}

export async function createSessionRecord(userId: string, tokenHash: string, expiresAt: Date) {
  await getDb().session.create({ data: { userId, tokenHash, expiresAt } });
}

export async function findSessionByTokenHash(tokenHash: string) {
  return getDb().session.findUnique({
    where: { tokenHash },
    select: {
      expiresAt: true,
      user: {
        select: {
          id: true,
          role: true,
          student: {
            select: { id: true, funding: true, level: { select: { code: true } } },
          },
          staff: { select: { id: true, unitId: true } },
        },
      },
    },
  });
}

export async function deleteSessionByTokenHash(tokenHash: string): Promise<void> {
  await getDb().session.deleteMany({ where: { tokenHash } });
}
