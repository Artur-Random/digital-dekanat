"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";

import { cancelOwnApplication } from "@/app/(student)/applications/actions";

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-danger text-danger-ink inline-flex min-h-11 items-center rounded-md px-4 font-medium disabled:opacity-70"
    >
      {pending ? "Отменяем…" : "Отменить заявку"}
    </button>
  );
}

/**
 * «Отменить заявку» с подтверждением в своём модальном окне (<dialog> + showModal):
 * фокус внутри окна, Escape закрывает, после закрытия фокус возвращается на кнопку.
 * По умолчанию фокус на безопасном «Не отменять».
 */
export function CancelApplicationButton({ applicationId }: { applicationId: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const keep = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => {
          dialog.current?.showModal();
          keep.current?.focus();
        }}
        aria-haspopup="dialog"
        className="border-danger text-danger mt-2 inline-flex min-h-11 items-center rounded-md border px-4 font-medium"
      >
        Отменить заявку
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="cancel-title"
        aria-describedby="cancel-desc"
        data-testid="cancel-dialog"
        onClose={() => trigger.current?.focus()}
        className="bg-surface text-ink m-auto w-[min(28rem,calc(100vw-2rem))] rounded-md p-5 shadow-lg backdrop:bg-black/50"
      >
        <h2 id="cancel-title" className="text-lg font-semibold">
          Отменить заявку?
        </h2>
        <p id="cancel-desc" className="mt-1">
          Это действие нельзя вернуть.
        </p>
        <form action={cancelOwnApplication} className="mt-4 flex flex-wrap gap-2">
          <input type="hidden" name="id" value={applicationId} />
          <ConfirmButton />
          <button
            ref={keep}
            type="button"
            onClick={() => dialog.current?.close()}
            className="border-ink-muted inline-flex min-h-11 items-center rounded-md border px-4 font-medium"
          >
            Не отменять
          </button>
        </form>
      </dialog>
    </>
  );
}
