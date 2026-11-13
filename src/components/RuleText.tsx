import type { NormView } from "@/server/dal/norms";

import { NormQuotes } from "./NormQuote";
import { PrototypeNote } from "./NormChip";

/** Текст правила из таблицы Rule с чипами норм, раскрывающими цитату. */
export function RuleText({
  text,
  normCodes,
  norms,
  testId,
  prototypeAssumption = false,
}: {
  text: string;
  normCodes: readonly string[];
  prototypeAssumption?: boolean;
  norms: ReadonlyMap<string, NormView>;
  testId?: string;
}) {
  return (
    <div data-testid={testId}>
      <p>{text}</p>
      <NormQuotes codes={normCodes} norms={norms} />
      {prototypeAssumption ? <PrototypeNote /> : null}
    </div>
  );
}
