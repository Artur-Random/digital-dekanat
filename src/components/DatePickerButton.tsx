"use client";

import { CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

/**
 * Кнопка «Выбрать дату»: открывает системный календарь (input type=date) и переходит
 * на /schedule?day=… На телефоне видна только иконка, подпись — в aria-label.
 * Без showPicker (старые Safari и Firefox) показывается обычное видимое поле даты.
 */
export function DatePickerButton({
  min,
  max,
  value,
  active,
  activeLabel,
}: {
  min: string;
  max: string;
  value: string;
  active: boolean;
  /** Выбранная дата словами для aria-label, когда открыт вид дня. */
  activeLabel?: string;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [inline, setInline] = useState(false);

  function open() {
    const el = input.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      try {
        el.showPicker();
        return;
      } catch {
        // Ниже — видимое поле.
      }
    }
    setInline(true);
    requestAnimationFrame(() => input.current?.focus());
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={open}
        aria-label={active && activeLabel ? `Выбрать дату, выбрано ${activeLabel}` : "Выбрать дату"}
        data-testid="pick-date"
        className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-3 font-medium ${
          active ? "bg-accent text-accent-ink" : "border-border border"
        }`}
      >
        <CalendarDays aria-hidden="true" className="size-5" />
        <span className="hidden md:inline">Выбрать дату</span>
      </button>
      <input
        // Вне вида дня поле пустое: выбор любой даты, включая сегодня, вызывает переход.
        // key: после перехода поле сбрасывается, и повторный выбор той же даты снова срабатывает.
        key={value || "empty"}
        ref={input}
        type="date"
        tabIndex={inline ? 0 : -1}
        aria-hidden={inline ? undefined : true}
        aria-label={inline ? "Дата" : undefined}
        min={min}
        max={max}
        defaultValue={value}
        data-testid="pick-date-input"
        onChange={(e) => {
          const day = e.target.value;
          if (day && day >= min && day <= max) router.push(`/schedule?day=${day}`);
        }}
        className={
          inline
            ? "border-ink-muted bg-surface absolute top-full right-0 z-10 mt-2 min-h-11 rounded-md border px-3"
            : "pointer-events-none absolute bottom-0 left-0 size-px opacity-0"
        }
      />
    </span>
  );
}
