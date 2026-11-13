import type { NormView } from "@/server/dal/norms";

import { NormQuotes } from "./NormQuote";

/** Текст правила из таблицы Rule с чипами норм, раскрывающими цитату. */
export function RuleText({
  text,
  normCodes,
  norms,
  testId,
}: {
  text: string;
  normCodes: readonly string[];
  norms: ReadonlyMap<string, NormView>;
  testId?: string;
}) {
  return (
    <div data-testid={testId}>
      <p>{text}</p>
      <NormQuotes codes={normCodes} norms={norms} />
    </div>
  );
}
