// Реестр экранов для smoke-тестов и автоскриншотов. Коды экранов из docs/spec-v1.md, раздел 2.
// Новый экран добавляется сюда, и он автоматически попадает в тесты и скриншоты.

import { applicationId, currentAssessmentOf, debtOf } from "./helpers/db";

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
  /** Дополнительно снять в эмуляции iPhone (scripts/screenshots.ts). */
  iphone?: boolean;
};

// EP — профиль сотрудника: в спецификации кода нет, экран добавлен заданием 2.
export const SCREENS: readonly Screen[] = [
  { code: "S0", slug: "login", path: "/login", role: "anonymous" },
  { code: "S1", slug: "home", path: "/", role: "student", account: "alina", iphone: true },
  {
    code: "S2",
    slug: "schedule-today",
    path: "/schedule",
    role: "student",
    account: "alina",
    iphone: true,
  },
  {
    code: "S2",
    slug: "schedule-week",
    path: "/schedule?view=week",
    role: "student",
    account: "alina",
  },
  { code: "S6", slug: "notifications", path: "/notifications", role: "student", account: "alina" },
  { code: "S8", slug: "why", path: "/why", role: "student", account: "alina" },
  { code: "S8", slug: "why-search", path: "/why?q=7.3", role: "student", account: "alina" },
  { code: "S3", slug: "study", path: "/study", role: "student", account: "alina" },
  {
    code: "S3a",
    slug: "discipline-debt",
    path: async () => `/study/${(await debtOf("alina")).assessmentId}`,
    role: "student",
    account: "alina",
    iphone: true,
  },
  {
    code: "S3a",
    slug: "discipline-current",
    path: async () => `/study/${(await currentAssessmentOf("alina", "EXAM")).id}`,
    role: "student",
    account: "alina",
  },
  { code: "S3", slug: "study-denis", path: "/study", role: "student", account: "denis" },
  { code: "S1", slug: "home-denis", path: "/", role: "student", account: "denis" },
  { code: "S2", slug: "schedule-denis", path: "/schedule", role: "student", account: "denis" },
  { code: "S4", slug: "applications", path: "/applications", role: "student", account: "alina" },
  { code: "S7", slug: "profile", path: "/profile", role: "student", account: "alina" },
  {
    code: "S4a",
    slug: "application-new",
    path: "/applications/new",
    role: "student",
    account: "alina",
  },
  {
    code: "S4a",
    slug: "application-new-cert",
    path: "/applications/new/CERT_ENROLLMENT",
    role: "student",
    account: "denis",
  },
  {
    code: "S4a",
    slug: "application-new-leave",
    path: "/applications/new/ACADEMIC_LEAVE",
    role: "student",
    account: "denis",
  },
  { code: "S5", slug: "cant-attend", path: "/cant-attend", role: "student", account: "alina" },
  {
    code: "S4b",
    slug: "application-extension",
    path: async () => `/applications/${await applicationId("alina", "PA_EXTENSION")}`,
    role: "student",
    account: "alina",
  },
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
  {
    code: "E2",
    slug: "staff-application-leave",
    path: async () => `/staff/applications/${await applicationId("denis", "ACADEMIC_LEAVE")}`,
    role: "staff",
    account: "mfc",
  },
];

export async function resolvePath(screen: Screen): Promise<string> {
  return typeof screen.path === "string" ? screen.path : screen.path();
}

export const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 1440, height: 900 },
] as const;
