import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    // Prisma разрешён только в слое доступа к данным (CLAUDE.md, «Безопасность», п. 2).
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/server/db.ts", "src/server/dal/**"],
    rules: {
      // Импорт типов разрешён: он не тянет Prisma в рантайм.
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/generated/prisma",
                "@/generated/prisma/*",
                "**/generated/prisma",
                "**/generated/prisma/*",
                "@prisma/*",
                "@/server/db",
                "**/server/db",
              ],
              message: "Prisma и getDb вызываются только из src/server/dal.",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
    "playwright-report/**",
    "test-results/**",
    "dist/**",
  ]),
]);
