"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { safeNextPath } from "@/lib/safe-next";

import { requireUser } from "./guards";
import { LOGIN_ERROR, authenticate } from "./login";
import { createSession, destroySession, setSessionCookie } from "./session";

export type LoginState = { error: string | null; login: string };

const loginSchema = z.object({
  login: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(256),
  next: z.string().max(2048).optional(),
});

function pluralMinutes(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} минуту`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} минуты`;
  return `${n} минут`;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    login: formData.get("login"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  const loginValue =
    typeof formData.get("login") === "string" ? String(formData.get("login")).slice(0, 64) : "";
  if (!parsed.success) {
    return { error: LOGIN_ERROR, login: loginValue };
  }

  const result = await authenticate(parsed.data.login, parsed.data.password);
  if (!result.ok) {
    const error =
      result.retryAfterMinutes === null
        ? LOGIN_ERROR
        : `${LOGIN_ERROR} Попробуйте через ${pluralMinutes(result.retryAfterMinutes)}.`;
    return { error, login: loginValue };
  }

  const { token, expiresAt } = await createSession(result.userId);
  await setSessionCookie(token, expiresAt);
  const home = result.role === "STAFF" ? "/staff" : "/";
  redirect(safeNextPath(parsed.data.next) ?? home);
}

export async function logoutAction(): Promise<void> {
  // Проверка сессии внутри action: аноним уйдёт на /login.
  await requireUser();
  await destroySession();
  redirect("/login");
}
