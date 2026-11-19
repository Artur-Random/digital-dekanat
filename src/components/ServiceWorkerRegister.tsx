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

/**
 * Очистка кешей при выходе. По очереди: сначала окно удаляет все кеши, затем service worker
 * получает «clear» и снова кладёт офлайн-страницу. Параллельно окно могло бы стереть уже
 * восстановленную офлайн-страницу (замечание Codex в PR #50).
 */
export async function clearAppCaches(): Promise<void> {
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    navigator.serviceWorker?.controller?.postMessage({ type: "clear" });
  } catch {
    // Кеши недоступны (приватный режим и т. п.) — выходим всё равно.
  }
}
