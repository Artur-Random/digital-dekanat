"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/** Кнопка отправки серверной формы: на время отправки неактивна и показывает pendingText. */
export function PendingSubmit({
  children,
  pendingText,
  className,
  ariaLabel,
}: {
  children: ReactNode;
  pendingText: string;
  className: string;
  ariaLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      aria-label={ariaLabel && !pending ? ariaLabel : pending ? pendingText : undefined}
      className={`${className} disabled:cursor-wait`}
    >
      {pending && !ariaLabel ? pendingText : children}
    </button>
  );
}
