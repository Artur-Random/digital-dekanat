import "server-only";

import { findUserForLogin, listRecentFailedAttempts, recordLoginAttempt } from "@/server/dal/auth";

import { verifyPassword } from "./password";

export const MAX_FAILED_ATTEMPTS = 5;
export const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

/** Одно сообщение и для неверного логина, и для неверного пароля (CLAUDE.md, п. 7). */
export const LOGIN_ERROR = "Неверный логин или пароль.";

export type LoginResult =
  | { ok: true; userId: string; role: "STUDENT" | "STAFF" }
  | { ok: false; retryAfterMinutes: number | null };

/** Через сколько минут снимется блокировка, если неудачных попыток уже не меньше лимита. */
export function lockoutMinutesLeft(failures: Date[], now: Date): number | null {
  if (failures.length < MAX_FAILED_ATTEMPTS) return null;
  // Блокировка снимается, когда в окне останется меньше MAX попыток.
  const pivot = failures[failures.length - MAX_FAILED_ATTEMPTS];
  if (!pivot) return null;
  const unlockAt = pivot.getTime() + ATTEMPT_WINDOW_MS;
  const left = unlockAt - now.getTime();
  return left > 0 ? Math.ceil(left / 60_000) : null;
}

export async function authenticate(
  login: string,
  password: string,
  now = new Date(),
): Promise<LoginResult> {
  const normalized = login.trim().toLowerCase();
  const failures = await listRecentFailedAttempts(
    normalized,
    new Date(now.getTime() - ATTEMPT_WINDOW_MS),
  );
  const lockedFor = lockoutMinutesLeft(failures, now);
  const user = await findUserForLogin(normalized);
  // Хэш считаем всегда, даже при блокировке и несуществующем логине: время ответа одинаковое.
  const valid = await verifyPassword(user?.passwordHash ?? null, password);

  if (lockedFor !== null) {
    // Попытки во время блокировки не записываем, иначе блокировку можно продлевать бесконечно.
    return { ok: false, retryAfterMinutes: lockedFor };
  }
  if (!user || !valid) {
    await recordLoginAttempt(normalized, false);
    const after = lockoutMinutesLeft([...failures, now], now);
    return { ok: false, retryAfterMinutes: after };
  }
  await recordLoginAttempt(normalized, true);
  return { ok: true, userId: user.id, role: user.role };
}
