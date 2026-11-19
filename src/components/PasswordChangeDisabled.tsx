import { Lock } from "lucide-react";

/** «Сменить пароль»: в демо неактивна, причина подписана и связана с кнопкой. */
export function PasswordChangeDisabled() {
  return (
    <div className="mt-8" data-testid="password-disabled">
      <button
        type="button"
        disabled
        aria-describedby="password-disabled-note"
        data-testid="password-button"
        className="border-border bg-surface-muted text-ink-muted inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-md border border-dashed px-4 font-medium opacity-60"
      >
        <Lock aria-hidden="true" className="size-5" />
        Сменить пароль
      </button>
      <p id="password-disabled-note" className="text-ink-muted mt-2 text-sm">
        В демоверсии пароли общие, смена отключена
      </p>
    </div>
  );
}
