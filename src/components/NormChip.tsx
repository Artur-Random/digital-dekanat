import Link from "next/link";

/** Ссылка на пункт нормы в «Почему так» (S8): там код, документ, пункт и дословная цитата. */
export function NormChip({ code }: { code: string }) {
  return (
    <Link
      href={`/why#${code}`}
      aria-label={`Норма ${code}: открыть цитату`}
      className="border-accent text-accent hover:bg-surface-muted inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-3 text-sm font-medium"
    >
      {code}
    </Link>
  );
}

/** Правило не из реестра норм. */
export function PrototypeNote() {
  return (
    <span className="text-ink-muted inline-flex min-h-11 items-center text-sm italic">
      так устроено в прототипе
    </span>
  );
}
