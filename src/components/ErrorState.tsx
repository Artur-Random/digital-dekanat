"use client";

import Link from "next/link";

type ErrorStateProps = { reset: () => void; homeHref: string };

// Детали ошибки не показываем: они только в серверном логе.
export function ErrorState({ reset, homeHref }: ErrorStateProps) {
  return (
    <>
      <h1 className="text-2xl font-semibold">Что-то пошло не так</h1>
      <p className="text-ink-muted mt-4">Страница не загрузилась. Попробуйте ещё раз.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="bg-accent text-accent-ink inline-flex min-h-11 items-center rounded-md px-4"
        >
          Повторить
        </button>
        <Link
          href={homeHref}
          className="border-ink-muted inline-flex min-h-11 items-center rounded-md border px-4"
        >
          На главную
        </Link>
      </div>
    </>
  );
}
