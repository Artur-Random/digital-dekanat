import { LogOut } from "lucide-react";

import { logoutAction } from "@/server/auth/actions";

type LogoutButtonProps = { variant?: "icon" | "full" };

export function LogoutButton({ variant = "full" }: LogoutButtonProps) {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        aria-label={variant === "icon" ? "Выйти" : undefined}
        className={
          variant === "icon"
            ? "text-ink-muted hover:text-ink inline-flex size-11 items-center justify-center rounded-md"
            : "border-ink-muted inline-flex min-h-11 items-center gap-2 rounded-md border px-4 font-medium"
        }
      >
        <LogOut aria-hidden="true" className="size-5" />
        {variant === "full" ? "Выйти" : null}
      </button>
    </form>
  );
}
