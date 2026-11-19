"use client";

import { LogIn } from "lucide-react";
import { useActionState } from "react";

import { type LoginState, loginAction } from "@/server/auth/actions";

import { useOfflineGuard } from "./forms/FormParts";

type LoginFormProps = { next: string | null };

const initialState: LoginState = { error: null, login: "" };

export function LoginForm({ next }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const guard = useOfflineGuard();

  return (
    <form
      action={formAction}
      onSubmit={guard.onSubmit}
      className="mt-6 flex flex-col gap-4"
      noValidate
    >
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div className="flex flex-col gap-1">
        <label htmlFor="login" className="font-medium">
          Логин
        </label>
        <input
          id="login"
          name="login"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={state.login}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "login-error" : undefined}
          className="border-ink-muted min-h-11 rounded-md border px-3"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="font-medium">
          Пароль
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "login-error" : undefined}
          className="border-ink-muted min-h-11 rounded-md border px-3"
        />
      </div>
      <p id="login-error" role="alert" className="text-danger min-h-6" data-testid="login-error">
        {guard.offlineMessage ?? state.error}
      </p>
      <button
        type="submit"
        disabled={pending}
        className="bg-accent text-accent-ink inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 font-medium disabled:opacity-70"
      >
        <LogIn aria-hidden="true" className="size-5" />
        {pending ? "Входим…" : "Войти"}
      </button>
    </form>
  );
}
