import { Construction } from "lucide-react";

type ScreenStubProps = {
  title: string;
};

/** Заглушка раздела до реализации. */
export function ScreenStub({ title }: ScreenStubProps) {
  return (
    <>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-ink-muted mt-4 flex items-center gap-2">
        <Construction aria-hidden="true" className="size-5 shrink-0" />
        Экран в разработке
      </p>
    </>
  );
}
