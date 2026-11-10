/** Собственный знак прототипа: не связан с логотипом МГПУ. */
export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 font-semibold">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6">
        <rect x="2" y="2" width="20" height="20" rx="6" className="fill-accent" />
        <path
          d="M8 7v10M8 12l6-5M8 12l6 5"
          className="stroke-accent-ink"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      <span>Кабинет</span>
    </span>
  );
}
