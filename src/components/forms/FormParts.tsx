import { type FormEvent, type ReactNode, type RefObject, useEffect, useState } from "react";

import type { FormState } from "@/lib/form-state";

/** Поле формы: подпись, подсказка и ошибка, связанные с полем через aria-describedby. */
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="text-ink-muted text-sm">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-danger text-sm" data-testid={`error-${id}`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** aria-атрибуты поля по наличию подсказки и ошибки. */
export function describedBy(id: string, hint: boolean, error?: string) {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": ids.length > 0 ? ids.join(" ") : undefined,
  } as const;
}

/** После неудачной отправки — фокус на первое поле с ошибкой. */
export function useFocusFirstError(form: RefObject<HTMLFormElement | null>, state: FormState) {
  useEffect(() => {
    if (!state.errors || Object.keys(state.errors).length === 0) return;
    // Поле с ошибкой или первая кнопка группы радиокнопок с ошибкой.
    const first = form.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"], fieldset[aria-describedby$="-error"] input:not(:disabled)',
    );
    first?.focus();
  }, [form, state]);
}

/** Ошибка группы радиокнопок: связана с группой через id. */
export function GroupError({ id, error }: { id: string; error?: string }) {
  return error ? (
    <p id={`${id}-error`} className="text-danger text-sm" data-testid={`error-${id}`}>
      {error}
    </p>
  ) : null;
}

export const inputClass = "border-ink-muted min-h-11 w-full rounded-md border px-3 py-2";

export function FormMessage({
  message,
  prototypeNote = false,
}: {
  message?: string;
  prototypeNote?: boolean;
}) {
  return (
    <div role="alert" className="min-h-6">
      <p className="text-danger" data-testid="form-message">
        {message}
      </p>
      {message && prototypeNote ? (
        <p className="text-ink-muted text-sm italic">так устроено в прототипе</p>
      ) : null}
    </div>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-accent text-accent-ink inline-flex min-h-11 items-center justify-center rounded-md px-5 font-medium disabled:opacity-70"
    >
      {pending ? "Отправляем…" : children}
    </button>
  );
}

export const OFFLINE_MESSAGE =
  "Нет соединения с интернетом. Данные не отправлены: проверьте связь и нажмите ещё раз.";

/**
 * Без сети форма не отправляется: вместо страницы ошибки — понятное сообщение у формы.
 * onSubmit с preventDefault останавливает и action формы (React его не вызывает).
 */
export function useOfflineGuard() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const clear = () => setOffline(false);
    window.addEventListener("online", clear);
    return () => window.removeEventListener("online", clear);
  }, []);
  return {
    offlineMessage: offline ? OFFLINE_MESSAGE : undefined,
    onSubmit: (event: FormEvent<HTMLFormElement>) => {
      if (navigator.onLine) {
        setOffline(false);
        return;
      }
      event.preventDefault();
      setOffline(true);
    },
  };
}
