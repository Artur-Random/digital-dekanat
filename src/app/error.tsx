"use client";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

// Детали ошибки студенту не показываем: они только в серверном логе.
export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-semibold">Что-то пошло не так</h1>
      <p className="text-ink-muted mt-4">Страница не загрузилась. Попробуйте ещё раз.</p>
      <button
        type="button"
        onClick={reset}
        className="bg-accent text-accent-ink mt-6 inline-flex min-h-11 items-center rounded-md px-4"
      >
        Повторить
      </button>
    </main>
  );
}
