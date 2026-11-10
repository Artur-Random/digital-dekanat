// Реестр экранов для smoke-тестов и автоскриншотов. Коды экранов из docs/spec-v1.md, раздел 2.
// Новый экран добавляется сюда, и он автоматически попадает в тесты и скриншоты.

export type ScreenRole = "anonymous" | "student" | "staff";

/** Тестовые аккаунты из docs/spec-v1.md, раздел 5. */
export type TestAccount = "alina" | "denis" | "mfc" | "dekanat";

export type Screen = {
  code: string;
  slug: string;
  path: string;
  role: ScreenRole;
  account?: TestAccount;
};

export const SCREENS: readonly Screen[] = [
  { code: "S0", slug: "login", path: "/login", role: "anonymous" },
  { code: "S1", slug: "home", path: "/", role: "student", account: "alina" },
  { code: "E1", slug: "staff-queue", path: "/staff", role: "staff", account: "dekanat" },
];

export const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 1440, height: 900 },
] as const;
