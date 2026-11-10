import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-semibold">Страница не найдена</h1>
      <p className="text-ink-muted mt-4">
        Такой страницы нет или у вас нет к ней доступа. Проверьте адрес.
      </p>
      <Link
        href="/"
        className="bg-accent text-accent-ink mt-6 inline-flex min-h-11 items-center rounded-md px-4"
      >
        На главную
      </Link>
    </main>
  );
}
