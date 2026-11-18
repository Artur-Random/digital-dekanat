import { Scale } from "lucide-react";
import Link from "next/link";

/** Ссылка на «Почему так» (S8) в шапке: на ПК с подписью, на телефоне иконка с aria-label. */
export function WhyLink() {
  return (
    <Link
      href="/why"
      aria-label="Почему так: нормы, на которых основаны сроки и подсказки"
      data-testid="why-link"
      className="text-ink-muted hover:text-ink inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-2"
    >
      <Scale aria-hidden="true" className="size-6 md:size-5" />
      <span className="hidden md:inline">Почему так</span>
    </Link>
  );
}
