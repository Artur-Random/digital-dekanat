"use client";

import { CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * «Выбрать дату»: нативное поле <input type="date"> лежит прозрачным поверх иконки на всю её
 * площадь, поэтому нажатие приходится прямо на поле. iOS Safari не открывает календарь из кода
 * (showPicker/click по скрытому полю) — так было до 20.11, и кнопка не реагировала. На ПК клик по
 * полю дополнительно вызывает showPicker, иначе Chrome только ставит фокус в поле.
 * На телефоне видна иконка, на ПК ещё и подпись; для чтения с экрана — aria-label поля.
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
  return (
    <span
      data-testid="pick-date"
      className={`relative inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-3 font-medium focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-[var(--color-accent)] ${
        active ? "bg-accent text-accent-ink" : "border-border border"
      }`}
    >
      <CalendarDays aria-hidden="true" className="size-5" />
      <span aria-hidden="true" className="hidden md:inline">
        Выбрать дату
      </span>
      <input
        // key: после перехода поле сбрасывается, и повторный выбор той же даты снова срабатывает.
        key={value || "empty"}
        type="date"
        aria-label={active && activeLabel ? `Выбрать дату, выбрано ${activeLabel}` : "Выбрать дату"}
        min={min}
        max={max}
        defaultValue={value}
        data-testid="pick-date-input"
        onClick={(e) => {
          try {
            e.currentTarget.showPicker();
          } catch {
            // iOS и старые браузеры открывают календарь сами по нажатию на поле.
          }
        }}
        onChange={(e) => {
          const day = e.target.value;
          if (day && day >= min && day <= max) router.push(`/schedule?day=${day}`);
        }}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
      />
    </span>
  );
}
