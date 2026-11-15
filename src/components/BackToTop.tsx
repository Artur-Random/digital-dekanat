"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Кнопка «Вверх» на длинных страницах: появляется после прокрутки на полтора экрана.
 * aboveNav — на телефоне над нижней панелью вкладок (у студента), на десктопе панели снизу нет.
 */
export function BackToTop({ aboveNav = false }: { aboveNav?: boolean }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const update = () => setVisible(window.scrollY > window.innerHeight * 1.5);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  if (!visible) return null;
  return (
    <button
      type="button"
      onClick={() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
        document.getElementById("main")?.focus({ preventScroll: true });
      }}
      aria-label="Наверх страницы"
      data-testid="back-to-top"
      className={`to-top-pos ${aboveNav ? "to-top-above-nav md:to-top-pos" : ""} bg-surface border-border text-ink fixed z-30 inline-flex size-12 items-center justify-center rounded-full border shadow-md`}
    >
      <ArrowUp aria-hidden="true" className="size-6" />
    </button>
  );
}
