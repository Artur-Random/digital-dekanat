"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Число экранов, открытых в этом документе. Обнуляется при полной загрузке страницы
// (прямой заход по ссылке, ярлык «На экран Домой»), растёт при переходах внутри сайта.
let screensInDocument = 0;
let lastPathname: string | null = null;

export function internalNavigationCount(): number {
  return screensInDocument;
}

/** Считает переходы внутри сайта. По нему BackButton решает: назад по истории или в раздел. */
export function NavTracker() {
  const pathname = usePathname();
  useEffect(() => {
    // В dev React запускает эффект дважды: считаем только смену адреса.
    if (pathname === lastPathname) return;
    lastPathname = pathname;
    screensInDocument += 1;
  }, [pathname]);
  return null;
}
