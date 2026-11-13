"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { internalNavigationCount } from "./NavTracker";

function hasInternalHistory(): boolean {
  return internalNavigationCount() > 1 && window.history.length > 1;
}

/**
 * «Назад» на вложенных экранах: в режиме «На экран Домой» на iPhone нет кнопки браузера.
 * Если внутри сайта есть история — шаг назад, иначе родительский раздел. Без JS — обычная
 * ссылка на родителя.
 */
export function BackButton({ fallbackHref }: { fallbackHref: string }) {
  const router = useRouter();
  return (
    <a
      href={fallbackHref}
      data-testid="back-button"
      onClick={(event) => {
        event.preventDefault();
        if (hasInternalHistory()) router.back();
        else router.push(fallbackHref);
      }}
      className="text-accent -ml-2 inline-flex min-h-11 min-w-11 items-center gap-1 rounded-md px-2 font-medium"
    >
      <ChevronLeft aria-hidden="true" className="size-5" />
      Назад
    </a>
  );
}
