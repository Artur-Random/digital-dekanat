/** Состояние загрузки блока: подпись для чтения с экрана и серые полосы. */
export function SectionSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-2">
      <span className="sr-only">{label}…</span>
      <div aria-hidden="true" className="bg-surface-muted h-16 animate-pulse rounded-md" />
      <div aria-hidden="true" className="bg-surface-muted h-16 animate-pulse rounded-md" />
    </div>
  );
}
