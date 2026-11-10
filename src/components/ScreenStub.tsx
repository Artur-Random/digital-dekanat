import { Construction } from "lucide-react";

type ScreenStubProps = {
  code: string;
  title: string;
};

/** Заглушка экрана до реализации. Код экрана из docs/spec-v1.md, раздел 2. */
export function ScreenStub({ code, title }: ScreenStubProps) {
  return (
    <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <p className="text-ink-muted text-sm">Экран {code}</p>
      <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
      <p className="text-ink-muted mt-4 flex items-center gap-2">
        <Construction aria-hidden="true" className="size-5 shrink-0" />
        Экран в разработке
      </p>
    </main>
  );
}
