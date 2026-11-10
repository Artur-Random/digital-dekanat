import "dotenv/config";

import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Вне Next.js пакет server-only бросает ошибку при импорте; в тестах подменяем пустым.
      "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", ".claude/hooks/**/*.test.ts", "scripts/**/*.test.ts"],
    // Тесты с базой сбрасывают демо-данные, поэтому файлы выполняются по очереди.
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
