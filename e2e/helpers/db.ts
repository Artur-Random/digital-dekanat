// Доступ к базе только для тестов: достать ID демо-записей и почистить попытки входа.
// Единственное место вне src/server/dal, где разрешён Prisma (см. CLAUDE.md и отчёт задания 2).

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { type ApplicationTypeCode, PrismaClient } from "../../src/generated/prisma/client";

let client: PrismaClient | null = null;

function db(): PrismaClient {
  if (!client) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL не задан для e2e");
    client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  }
  return client;
}

/** ID заявки демо-студента по типу. Падает, если сид не выполнен. */
export async function applicationId(
  login: "alina" | "denis",
  type: ApplicationTypeCode,
): Promise<string> {
  const app = await db().application.findFirst({
    where: { type: { code: type }, student: { user: { login } } },
    select: { id: true },
  });
  if (!app) throw new Error(`Нет заявки ${type} у ${login}: выполните npm run demo:reset`);
  return app.id;
}

export async function clearLoginAttempts(login: string): Promise<void> {
  await db().loginAttempt.deleteMany({ where: { login } });
}

export async function disconnect(): Promise<void> {
  await client?.$disconnect();
  client = null;
}
