import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { cache } from "react";

import type { EducationLevelCode, Funding, Role } from "@/generated/prisma/client";
import {
  createSessionRecord,
  deleteSessionByTokenHash,
  findSessionByTokenHash,
} from "@/server/dal/auth";

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

const isProduction = process.env.NODE_ENV === "production";

// Префикс __Host- браузер принимает только с Secure, Path=/ и без Domain: cookie нельзя
// подменить с поддомена. В dev сайт открыт по http, поэтому без префикса.
export const SESSION_COOKIE = isProduction ? "__Host-dd_session" : "dd_session";

export type SessionUser = {
  userId: string;
  role: Role;
  student: { studentId: string; levelCode: EducationLevelCode; funding: Funding } | null;
  staff: { staffId: string; unitId: string } | null;
};

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Создаёт сессию в базе и возвращает токен для cookie. В базе только SHA-256 от токена. */
export async function createSession(
  userId: string,
  now = new Date(),
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await createSessionRecord(userId, hashToken(token), expiresAt);
  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

async function readToken(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  // Токен 32 байта в base64url — 43 символа. Остальное даже не ищем в базе.
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

/** Пользователь текущего запроса или null. Кэшируется на время одного запроса. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = await readToken();
  if (!token) return null;
  const tokenHash = hashToken(token);
  const session = await findSessionByTokenHash(tokenHash);
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await deleteSessionByTokenHash(tokenHash);
    return null;
  }
  const { user } = session;
  return {
    userId: user.id,
    role: user.role,
    student: user.student
      ? {
          studentId: user.student.id,
          levelCode: user.student.level.code,
          funding: user.student.funding,
        }
      : null,
    staff: user.staff ? { staffId: user.staff.id, unitId: user.staff.unitId } : null,
  };
});

/** Выход: удаляет сессию в базе и cookie. */
export async function destroySession(): Promise<void> {
  const token = await readToken();
  if (token) await deleteSessionByTokenHash(hashToken(token));
  const store = await cookies();
  store.delete({ name: SESSION_COOKIE, path: "/" });
}
