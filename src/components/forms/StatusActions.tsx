"use client";

import { useActionState } from "react";

import { changeStatus } from "@/app/(staff)/staff/applications/actions";
import { EMPTY_FORM_STATE } from "@/lib/form-state";

import { FormMessage, describedBy, inputClass, useOfflineGuard } from "./FormParts";

export type TransitionButton = { to: string; label: string; kind: "advance" | "reject" };

/** E2: кнопки только допустимых переходов и комментарий студенту; при отказе причина обязательна. */
export function StatusActions({
  applicationId,
  transitions,
}: {
  applicationId: string;
  transitions: TransitionButton[];
}) {
  const [state, action, pending] = useActionState(changeStatus, EMPTY_FORM_STATE);
  const guard = useOfflineGuard();
  const e = state.errors ?? {};
  const hasReject = transitions.some((t) => t.kind === "reject");
  return (
    <form
      action={action}
      onSubmit={guard.onSubmit}
      className="flex flex-col gap-3"
      noValidate
      data-testid="status-actions"
    >
      <input type="hidden" name="id" value={applicationId} />
      <div className="flex flex-col gap-1">
        <label htmlFor="comment" className="font-medium">
          Комментарий студенту{hasReject ? " (при отказе — причина, обязательно)" : ""}
        </label>
        <textarea
          id="comment"
          name="comment"
          rows={3}
          maxLength={1000}
          defaultValue={state.values?.comment ?? ""}
          className={inputClass}
          {...describedBy("comment", false, e.comment)}
        />
        {e.comment ? (
          <p id="comment-error" className="text-danger text-sm" data-testid="error-comment">
            {e.comment}
          </p>
        ) : null}
      </div>
      <FormMessage message={guard.offlineMessage ?? state.message} />
      {pending ? (
        <p role="status" className="text-ink-muted text-sm">
          Сохраняем…
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {transitions.map((t) => (
          <button
            key={t.to}
            type="submit"
            name="to"
            value={t.to}
            disabled={pending}
            className={
              t.kind === "reject"
                ? "border-danger text-danger inline-flex min-h-11 items-center rounded-md border px-4 font-medium disabled:opacity-70"
                : "bg-accent text-accent-ink inline-flex min-h-11 items-center rounded-md px-4 font-medium disabled:opacity-70"
            }
          >
            {t.label}
          </button>
        ))}
      </div>
    </form>
  );
}
