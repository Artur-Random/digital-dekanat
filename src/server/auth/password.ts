import "server-only";

import argon2 from "argon2";

// Параметры argon2id по умолчанию у библиотеки: 64 МиБ памяти, 3 прохода, 4 потока
// (не ниже рекомендаций OWASP для argon2id).
const OPTIONS = { type: argon2.argon2id } as const;

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, OPTIONS);
}

let dummyHash: Promise<string> | null = null;

/**
 * Проверка пароля. Если пользователя нет, всё равно считаем argon2 по хэшу-заглушке,
 * чтобы время ответа не выдавало, существует ли логин.
 */
export async function verifyPassword(hash: string | null, password: string): Promise<boolean> {
  if (hash === null) {
    dummyHash ??= argon2.hash("dummy-password-for-timing", OPTIONS);
    await argon2.verify(await dummyHash, password).catch(() => false);
    return false;
  }
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}
