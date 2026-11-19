// Тема интерфейса: выбор хранится в cookie, чтобы сервер сразу отдал нужный data-theme
// и при загрузке не мелькал белый экран. Не персональные данные, не секрет.

export const THEME_COOKIE = "theme";

export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_LABEL: Record<Theme, string> = {
  system: "Как в системе",
  light: "Светлая",
  dark: "Тёмная",
};

export function parseTheme(value: string | undefined): Theme {
  return (THEMES as readonly string[]).includes(value ?? "") ? (value as Theme) : "system";
}
