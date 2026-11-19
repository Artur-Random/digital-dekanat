"use client";

import "@/fonts/golos-text/golos-text.css";
import "./globals.css";

import { ConceptBanner } from "@/components/ConceptBanner";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

// Заменяет корневой layout при его падении, поэтому свои html, body и плашка.
export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html lang="ru">
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <ConceptBanner />
        <main
          id="main"
          className="safe-x mx-auto w-full max-w-[96rem] flex-1 pt-8 pb-[calc(2rem+env(safe-area-inset-bottom))] lg:px-8"
        >
          <h1 className="text-2xl font-semibold">Что-то пошло не так</h1>
          <p className="text-ink-muted mt-4">Сервис временно недоступен. Попробуйте ещё раз.</p>
          <button
            type="button"
            onClick={reset}
            className="bg-accent text-accent-ink mt-6 inline-flex min-h-11 items-center rounded-md px-4"
          >
            Повторить
          </button>
        </main>
      </body>
    </html>
  );
}
