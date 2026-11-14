// Тесты с настоящей базой (DATABASE_URL из .env). Сбрасывают демо-данные.

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { authenticate, lockoutMinutesLeft } from "@/server/auth/login";
import { createSession, hashToken } from "@/server/auth/session";
import { getDb, disconnectDb } from "@/server/db";

import { APPLICATION_TYPES } from "./demo/application-types";
import { HOLIDAYS } from "./demo/holidays";
import { STAFF, STUDENTS } from "./demo/people";
import { resetDemoData } from "./demo/reset";

beforeAll(async () => {
  await resetDemoData({ today: "2026-11-10" });
});

afterAll(async () => {
  await disconnectDb();
});

describe("сброс демо-данных", () => {
  it("создаёт ожидаемое число записей и идемпотентен", async () => {
    const expected = {
      levels: 8,
      units: 3,
      holidays: HOLIDAYS.length,
      // 4 уровня × (4 оценки экзамена + 4 дифзачёта + 2 зачёта)
      gradeBands: 40,
      norms: 47,
      applicationTypes: APPLICATION_TYPES.length,
      users: STUDENTS.length + STAFF.length,
      students: 2,
      staff: 2,
      groups: 2,
      applications: 4,
      applicationEvents: 7,
      // ПС-251: 15 пар в неделю, МП-261: 7 пар в неделю, 9 недель без праздника 4 ноября,
      // плюс пересдача Алины. Проверяется в schedule.test.ts.
      scheduleEvents: expect.any(Number),
      // Смена аудитории, отмена, перенос и замена преподавателя у ПС-251, замена у МП-261.
      scheduleChanges: 5,
      debts: 1,
      // Алина: 4 изменения, пересдача, справка, объявление; Денис: изменение и 2 объявления.
      notifications: 10,
      // 17 текстов правил, по одному на четыре уровня (задание 5, сверка 14.11).
      rules: 17,
      // Алина: 6 + 5 результатов и 7 дисциплин текущего семестра; Денис: 4 зачёта.
      assessments: 22,
    };
    expect(await resetDemoData({ today: "2026-11-10" })).toEqual(expected);
    expect(await resetDemoData({ today: "2026-11-10" })).toEqual(expected);
  });

  it("падает без паролей демо-аккаунтов и не трогает базу", async () => {
    const before = await getDb().user.count();
    await expect(resetDemoData({ env: {} })).rejects.toThrow(/DEMO_PASSWORD_ALINA/);
    expect(await getDb().user.count()).toBe(before);
  });

  it("даты считаются от «сегодня» в рабочих днях", async () => {
    const app = await getDb().application.findFirst({
      where: { type: { code: "PA_EXTENSION" } },
      select: { createdAt: true, stageDeadline: true },
    });
    // Подано 1 рабочий день назад (9 ноября), срок 5 рабочих дней → 16 ноября.
    expect(app?.createdAt.toISOString()).toBe("2026-11-09T07:15:00.000Z");
    expect(app?.stageDeadline?.toISOString().slice(0, 10)).toBe("2026-11-16");
  });
});

describe("пароли и сессии в базе", () => {
  it("хэш демо-пароля начинается с $argon2id$ и не равен паролю", async () => {
    const users = await getDb().user.findMany({ select: { login: true, passwordHash: true } });
    expect(users).toHaveLength(4);
    for (const user of users) {
      expect(user.passwordHash.startsWith("$argon2id$"), user.login).toBe(true);
      const envName = [...STUDENTS, ...STAFF].find((p) => p.login === user.login)?.passwordEnv;
      expect(user.passwordHash).not.toContain(process.env[envName ?? ""] ?? "—");
    }
  });

  it("в базе хранится SHA-256 от токена, а не сам токен", async () => {
    const user = await getDb().user.findUniqueOrThrow({ where: { login: "alina" } });
    const { token } = await createSession(user.id);
    const stored = await getDb().session.findMany({ where: { userId: user.id } });
    expect(stored).toHaveLength(1);
    expect(stored[0]?.tokenHash).not.toBe(token);
    expect(stored[0]?.tokenHash).toBe(hashToken(token));
    expect(stored[0]?.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});

describe("блокировка входа", () => {
  it("параллельные попытки не обходят лимит: пароль проверяют не больше 5 из 10", async () => {
    const login = "race-test-login";
    await getDb().loginAttempt.deleteMany({ where: { login } });
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => authenticate(login, `wrong-${i}`)),
    );
    expect(results.every((r) => !r.ok)).toBe(true);
    // Попытки, отклонённые блокировкой, удаляются; остаются только проверенные паролем.
    const verified = await getDb().loginAttempt.count({ where: { login, success: false } });
    expect(verified).toBeLessThanOrEqual(5);
    await getDb().loginAttempt.deleteMany({ where: { login } });
  });

  it("верный пароль после 5 неудач не пускает", async () => {
    await getDb().loginAttempt.deleteMany({ where: { login: "denis" } });
    for (let i = 0; i < 5; i++) await authenticate("denis", `wrong-${i}`);
    const result = await authenticate("denis", process.env.DEMO_PASSWORD_DENIS ?? "");
    expect(result.ok).toBe(false);
    expect(!result.ok && result.retryAfterMinutes).toBeGreaterThan(0);
    await getDb().loginAttempt.deleteMany({ where: { login: "denis" } });
  });

  const now = new Date("2026-11-10T12:00:00Z");
  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);

  it("меньше 5 неудач — не блокируем", () => {
    expect(lockoutMinutesLeft([minutesAgo(3), minutesAgo(2)], now)).toBeNull();
  });

  it("5 неудач — блокировка до истечения 15 минут с первой из них", () => {
    const fails = [10, 8, 6, 4, 2].map(minutesAgo);
    expect(lockoutMinutesLeft(fails, now)).toBe(5);
  });
});
