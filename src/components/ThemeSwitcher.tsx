"use client";

import { useEffect, useRef, useState } from "react";

import { THEMES, THEME_COOKIE, THEME_LABEL, type Theme } from "@/lib/theme";

/**
 * Тема: «Как в системе», «Светлая», «Тёмная». Выбор в cookie на год (не секрет, без httpOnly:
 * читает только сервер при следующей загрузке), сразу применяется к <html data-theme>.
 */
export function ThemeSwitcher({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);
  const changed = useRef(false);

  // Применение выбора — эффект: атрибут <html> и cookie меняются вне React.
  useEffect(() => {
    if (!changed.current) return;
    document.documentElement.setAttribute("data-theme", theme);
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${THEME_COOKIE}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  }, [theme]);

  function choose(next: Theme) {
    changed.current = true;
    setTheme(next);
  }

  return (
    <fieldset className="mt-8" data-testid="theme-switcher">
      <legend className="font-semibold">Тема оформления</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {THEMES.map((t) => (
          <label
            key={t}
            className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 ${
              theme === t ? "border-accent border-2 font-medium" : "border-border"
            }`}
          >
            <input
              type="radio"
              name="theme"
              value={t}
              checked={theme === t}
              onChange={() => choose(t)}
              className="size-5"
            />
            {THEME_LABEL[t]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
