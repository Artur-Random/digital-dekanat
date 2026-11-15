import Link from "next/link";

/** Норма для чипа: код — только для якоря, на экране документ и пункт («754общ, п. 2.13»). */
export type NormRef = { code: string; label: string };

/** Ссылка на пункт нормы в «Почему так» (S8): там документ, пункт и дословная цитата. */
export function NormChip({ code, label }: NormRef) {
  return (
    <Link
      href={`/why#${code}`}
      aria-label={`${label}: открыть цитату`}
      className="border-accent text-accent hover:bg-surface-muted inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-3 text-sm font-medium"
    >
      {label}
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
