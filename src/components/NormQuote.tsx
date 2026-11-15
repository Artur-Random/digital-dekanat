import { ChevronDown } from "lucide-react";
import Link from "next/link";

import { normLabel } from "@/lib/norm-label";
import type { NormView } from "@/server/dal/norms";

/**
 * Чип нормы, который раскрывает дословную цитату на месте (details/summary, без JS)
 * и ведёт на «Почему так» (S8).
 */
export function NormQuote({ norm }: { norm: NormView }) {
  const label = normLabel(norm);
  return (
    <details className="group open:w-full" data-testid="norm-quote" data-code={norm.code}>
      <summary
        aria-label={`${label}: показать цитату`}
        className="border-accent text-accent hover:bg-surface-muted inline-flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-full border px-3 text-sm font-medium [&::-webkit-details-marker]:hidden"
      >
        {label}
        <ChevronDown
          aria-hidden="true"
          className="size-4 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="border-border bg-surface-muted mt-2 rounded-md border p-3 text-sm [overflow-wrap:anywhere]">
        <p className="text-ink-muted">
          {norm.document}, {norm.clause}
          {norm.page ? `, стр. ${norm.page}` : ""}
        </p>
        <blockquote className="border-border mt-1 border-l-4 pl-3">«{norm.quote}»</blockquote>
        <Link
          href={`/why#${norm.code}`}
          className="text-accent mt-1 inline-flex min-h-11 items-center underline"
        >
          Открыть в «Почему так»
        </Link>
      </div>
    </details>
  );
}

/** Ряд чипов с цитатами. Неизвестный код показывается простым текстом, без ссылки. */
export function NormQuotes({
  codes,
  norms,
}: {
  codes: readonly string[];
  norms: ReadonlyMap<string, NormView>;
}) {
  if (codes.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {codes.map((code) => {
        const norm = norms.get(code);
        return norm ? <NormQuote key={code} norm={norm} /> : <span key={code}>{code}</span>;
      })}
    </div>
  );
}
