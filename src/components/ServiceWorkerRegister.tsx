"use client";

import { useEffect } from "react";

/** Регистрация service worker из отдельного файла (не inline-скрипт), только в production. */
export function ServiceWorkerRegister({ version }: { version: string }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker
      .register(`/sw.js?v=${encodeURIComponent(version)}`, { scope: "/" })
      .catch(() => {
        // Без service worker сайт работает как обычный: офлайн-страницы просто не будет.
      });
  }, [version]);
  return null;
}

/** Очистка кешей при выходе: и в окне, и через service worker. */
export async function clearAppCaches(): Promise<void> {
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: "clear" });
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // Кеши недоступны (приватный режим и т. п.) — выходим всё равно.
  }
}
