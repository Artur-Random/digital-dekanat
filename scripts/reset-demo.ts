// npm run demo:reset и prisma seed: полный сброс демо-данных.
// Запускается с --conditions=react-server, чтобы модули с "server-only" загружались вне Next.js.

import "dotenv/config";

import { resetDemoData } from "@/server/dal/demo/reset";
import { disconnectDb } from "@/server/db";

async function main(): Promise<void> {
  const summary = await resetDemoData();
  // Только количества записей: ни паролей, ни хэшей.
  console.log("Демо-данные сброшены:", summary);
}

main()
  .catch((error: unknown) => {
    console.error(
      "Сброс не выполнен:",
      // Свои ошибки (нет паролей, формат реестра) печатаем целиком; ошибки драйвера базы
      // только именем: в их тексте бывают хост, пользователь и SQL.
      error instanceof Error
        ? error.constructor === Error ||
          error.name === "NormsRegistryError" ||
          error.name === "ZodError"
          ? error.message
          : error.name
        : "неизвестная ошибка",
    );
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
