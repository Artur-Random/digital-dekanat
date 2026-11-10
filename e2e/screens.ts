// Реестр экранов для smoke-тестов и автоскриншотов. Коды экранов из docs/spec-v1.md, раздел 2.
// Новый экран добавляется сюда, и он автоматически попадает в тесты и скриншоты.

import { applicationId } from "./helpers/db";

export type ScreenRole = "anonymous" | "student" | "staff";

/** Тестовые аккаунты из docs/spec-v1.md, раздел 5. */
export type TestAccount = "alina" | "denis" | "mfc" | "dekanat";

export type Screen = {
  code: string;
  slug: string;
  /** Путь или функция, которая достаёт ID записи из демо-данных. */
  path: string | (() => Promise<string>);
  role: ScreenRole;
  account?: TestAccount;
};

// EP — профиль сотрудника: в спецификации кода нет, экран добавлен заданием 2.
export const SCREENS: readonly Screen[] = [
  { code: "S0", slug: "login", path: "/login", role: "anonymous" },
  { code: "S1", slug: "home", path: "/", role: "student", account: "alina" },
  { code: "S4", slug: "applications", path: "/applications", role: "student", account: "alina" },
  { code: "S7", slug: "profile", path: "/profile", role: "student", account: "alina" },
  {
    code: "S4b",
    slug: "application",
    path: async () => `/applications/${await applicationId("alina", "CERT_ENROLLMENT")}`,
    role: "student",
    account: "alina",
  },
  { code: "EP", slug: "staff-profile", path: "/staff/profile", role: "staff", account: "mfc" },
  { code: "E1", slug: "staff-queue", path: "/staff", role: "staff", account: "dekanat" },
  {
    code: "E2",
    slug: "staff-application",
    path: async () => `/staff/applications/${await applicationId("alina", "PA_EXTENSION")}`,
    role: "staff",
    account: "dekanat",
  },
];

export async function resolvePath(screen: Screen): Promise<string> {
  return typeof screen.path === "string" ? screen.path : screen.path();
}

export const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 1440, height: 900 },
] as const;
