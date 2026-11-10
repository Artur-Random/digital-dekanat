// npm run demo:reset и prisma seed: полный сброс демо-данных.
// Запускается с --conditions=react-server, чтобы модули с "server-only" загружались вне Next.js.

import "dotenv/config";

import { NormsRegistryError } from "@/lib/norms-registry";
import { DemoResetError, resetDemoData } from "@/server/dal/demo/reset";
import { disconnectDb } from "@/server/db";

async function main(): Promise<void> {
  const summary = await resetDemoData();
  // Только количества записей: ни паролей, ни хэшей.
  console.log("Демо-данные сброшены:", summary);
}

main()
  .catch((error: unknown) => {
    // Свои ошибки (нет паролей, формат реестра) печатаем целиком; ошибки драйвера и Node
    // только именем: в их тексте бывают хост, порт, пользователь и SQL.
    const safe = error instanceof DemoResetError || error instanceof NormsRegistryError;
    const text = safe ? error.message : error instanceof Error ? error.name : "неизвестная ошибка";
    console.error("Сброс не выполнен:", text);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
