import Link from "next/link";

type NotFoundContentProps = { homeHref?: string };

/** Один и тот же текст для несуществующей и чужой записи: не подтверждаем, что она есть. */
export function NotFoundContent({ homeHref = "/" }: NotFoundContentProps) {
  return (
    <>
      <h1 className="text-2xl font-semibold">Страница не найдена</h1>
      <p className="text-ink-muted mt-4">
        Такой страницы нет или у вас нет к ней доступа. Проверьте адрес.
      </p>
      <Link
        href={homeHref}
        className="bg-accent text-accent-ink mt-6 inline-flex min-h-11 items-center rounded-md px-4"
      >
        На главную
      </Link>
    </>
  );
}
