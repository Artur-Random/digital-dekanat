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

/** Новая попытка входа записывается как неудачная ДО проверки пароля (см. src/server/auth/login.ts). */
export async function startLoginAttempt(login: string): Promise<string> {
  const row = await getDb().loginAttempt.create({
    data: { login, success: false },
    select: { id: true },
  });
  return row.id;
}

export async function markLoginAttemptSucceeded(id: string): Promise<void> {
  await getDb().loginAttempt.update({ where: { id }, data: { success: true } });
}

export async function deleteLoginAttempt(id: string): Promise<void> {
  await getDb().loginAttempt.deleteMany({ where: { id } });
}

/** Неудачные попытки в окне после последнего успешного входа, от старых к новым. */
export async function listRecentFailedAttempts(
  login: string,
  since: Date,
): Promise<{ id: string; createdAt: Date }[]> {
  const db = getDb();
  const lastSuccess = await db.loginAttempt.findFirst({
    where: { login, success: true, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const from = lastSuccess && lastSuccess.createdAt > since ? lastSuccess.createdAt : since;
  return db.loginAttempt.findMany({
    where: { login, success: false, createdAt: { gt: from } },
    orderBy: { createdAt: "asc" },
    select: { id: true, createdAt: true },
  });
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
