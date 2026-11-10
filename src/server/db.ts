import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

// Единственный экземпляр Prisma Client. В dev модуль перезагружается при каждом изменении,
// поэтому клиент кладём в globalThis, иначе исчерпаем пул соединений.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL не задан");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export function getDb(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createClient();
  }
  return globalForPrisma.prisma;
}

/** Закрыть соединения: для скриптов и тестов, которые должны завершиться. */
export async function disconnectDb(): Promise<void> {
  await globalForPrisma.prisma?.$disconnect();
  globalForPrisma.prisma = undefined;
}
