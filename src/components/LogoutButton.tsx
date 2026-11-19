"use client";

import { LogOut } from "lucide-react";

import { logoutAction } from "@/server/auth/actions";

import { PendingSubmit } from "./PendingSubmit";
import { clearAppCaches } from "./ServiceWorkerRegister";

type LogoutButtonProps = { variant?: "icon" | "full" };

/** Выход: сначала очищаются кеши браузера и service worker (PWA), затем сессия на сервере. */
export function LogoutButton({ variant = "full" }: LogoutButtonProps) {
  async function logout() {
    await clearAppCaches();
    await logoutAction();
  }
  return (
    <form action={logout}>
      <PendingSubmit
        pendingText="Выходим…"
        ariaLabel={variant === "icon" ? "Выйти" : undefined}
        className={
          variant === "icon"
            ? "text-ink-muted hover:text-ink inline-flex size-11 items-center justify-center rounded-md"
            : "border-ink-muted inline-flex min-h-11 items-center gap-2 rounded-md border px-4 font-medium"
        }
      >
        <LogOut aria-hidden="true" className="size-5" />
        {variant === "full" ? "Выйти" : null}
      </PendingSubmit>
    </form>
  );
}
