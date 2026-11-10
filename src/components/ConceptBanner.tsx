import { Info } from "lucide-react";

import { CONCEPT_BANNER_TEXT } from "@/lib/concept";

export function ConceptBanner() {
  return (
    <aside
      aria-label="О прототипе"
      data-testid="concept-banner"
      className="border-border bg-notice text-notice-ink border-b"
    >
      <div className="mx-auto flex max-w-5xl items-start gap-2 px-4 py-2 text-sm">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <p>{CONCEPT_BANNER_TEXT}</p>
      </div>
    </aside>
  );
}
