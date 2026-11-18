"use client";

import { CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef } from "react";

/**
 * Кнопка «Выбрать дату»: открывает системный календарь (input type=date) и переходит
 * на /schedule?day=… На телефоне видна только иконка, подпись — в aria-label.
 */
export function DatePickerButton({
  min,
  max,
  value,
  active,
}: {
  min: string;
  max: string;
  value: string;
  active: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);

  function open() {
    const el = input.current;
    if (!el) return;
    // showPicker есть в современных браузерах; иначе фокус и клик по полю.
    try {
      el.showPicker();
    } catch {
      el.focus();
      el.click();
    }
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={open}
        aria-label="Выбрать дату"
        aria-pressed={active}
        data-testid="pick-date"
        className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-3 font-medium ${
          active ? "bg-accent text-accent-ink" : "border-border border"
        }`}
      >
        <CalendarDays aria-hidden="true" className="size-5" />
        <span className="hidden md:inline">Выбрать дату</span>
      </button>
      <input
        ref={input}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        min={min}
        max={max}
        defaultValue={value}
        data-testid="pick-date-input"
        onChange={(e) => {
          const day = e.target.value;
          if (day) router.push(`/schedule?day=${day}`);
        }}
        className="pointer-events-none absolute bottom-0 left-0 size-px opacity-0"
      />
    </span>
  );
}
