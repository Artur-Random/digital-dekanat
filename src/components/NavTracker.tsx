"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Глубина истории внутри сайта для текущей записи: 1 — первый экран после полной загрузки
// (прямой заход по ссылке, ярлык «На экран Домой»). Переход вперёд добавляет экран,
// «Назад» (popstate) убирает. Так «Назад» после возврата к первому экрану уйдёт в родителя,
// а не на чужой сайт.
let depth = 0;
let lastPathname: string | null = null;
let popPending = false;
let listening = false;

export function internalNavigationCount(): number {
  return depth;
}

export function NavTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!listening) {
      listening = true;
      window.addEventListener("popstate", () => {
        popPending = true;
      });
    }
  }, []);
  useEffect(() => {
    // В dev React запускает эффект дважды: считаем только смену адреса.
    if (pathname === lastPathname) return;
    lastPathname = pathname;
    if (depth === 0) depth = 1;
    else if (popPending) depth = Math.max(1, depth - 1);
    else depth += 1;
    popPending = false;
  }, [pathname]);
  return null;
}
