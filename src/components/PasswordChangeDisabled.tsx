import { Lock } from "lucide-react";

/** «Сменить пароль»: в демо неактивна, причина подписана и связана с кнопкой. */
export function PasswordChangeDisabled() {
  return (
    <div className="mt-8" data-testid="password-disabled">
      <button
        type="button"
        disabled
        aria-describedby="password-disabled-note"
        className="border-border text-ink-muted inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-md border px-4 font-medium"
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
