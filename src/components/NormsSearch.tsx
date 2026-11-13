"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import type { NormView } from "@/server/dal/norms";

/** Поиск по нормам на клиенте: норм мало (около 40), сервер для этого не нужен. */
export function NormsSearch({
  norms,
  initialQuery = "",
}: {
  norms: NormView[];
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const found = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return norms;
    return norms.filter((n) =>
      [n.code, n.document, n.clause, n.quote, n.usedIn ?? ""].some((field) =>
        field.toLowerCase().includes(q),
      ),
    );
  }, [norms, query]);

  return (
    <>
      <div className="mt-4">
        <label htmlFor="norm-search" className="font-medium">
          Поиск по коду, документу или тексту
        </label>
        <div className="relative mt-1">
          <Search aria-hidden="true" className="text-ink-muted absolute top-3 left-3 size-5" />
          <input
            id="norm-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Например, 7.3 или стипендия"
            className="border-ink-muted min-h-11 w-full rounded-md border py-2 pr-3 pl-10"
          />
        </div>
        <p className="text-ink-muted mt-1 text-sm" aria-live="polite" data-testid="norms-count">
          Найдено норм: {found.length}
        </p>
      </div>
      {found.length === 0 ? (
        <p className="text-ink-muted mt-4">Ничего не найдено. Попробуйте другой запрос.</p>
      ) : (
        <ol className="mt-4 flex flex-col gap-4">
          {found.map((n) => (
            <li
              key={n.code}
              id={n.code}
              data-testid="norm"
              className="border-border target:border-accent scroll-mt-[calc(1rem+var(--safe-top))] rounded-md border p-4 [overflow-wrap:anywhere] target:border-2"
            >
              <h2 className="font-semibold">{n.code}</h2>
              <p className="text-ink-muted text-sm">
                {n.document}, {n.clause}
                {n.page ? `, стр. ${n.page}` : ""}
              </p>
              <blockquote className="border-border mt-2 border-l-4 pl-3">{n.quote}</blockquote>
              {n.usedIn ? (
                <p className="mt-2 text-sm" data-testid="used-in">
                  <span className="font-medium">Где используется:</span> {n.usedIn}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
