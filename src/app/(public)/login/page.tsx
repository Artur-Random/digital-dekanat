import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/LoginForm";
import { Logo } from "@/components/Logo";
import { safeNextPath } from "@/lib/safe-next";
import { getSessionUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Вход" };

type Props = { searchParams: Promise<{ next?: string | string[] }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next: rawNext } = await searchParams;
  const next = safeNextPath(Array.isArray(rawNext) ? rawNext[0] : rawNext);

  // Уже вошедшего пользователя на форму не пускаем.
  const user = await getSessionUser();
  if (user) redirect(next ?? (user.role === "STAFF" ? "/staff" : "/"));

  return (
    <main id="main" className="mx-auto w-full max-w-sm flex-1 px-4 py-8">
      <Logo />
      <h1 className="mt-6 text-2xl font-semibold">Вход</h1>
      <p className="text-ink-muted mt-2">
        Логин и пароль демо-аккаунта указаны в комментарии к работе.
      </p>
      <LoginForm next={next} />
    </main>
  );
}
