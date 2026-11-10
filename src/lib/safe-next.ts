// Защита от открытого редиректа: ?next= принимает только относительный путь внутри сайта.

const BASE = "http://internal.invalid";

/** Путь, который браузер может понять как адрес другого сайта: «//host», «/\host». */
function looksExternal(path: string): boolean {
  return path.startsWith("//") || path.startsWith("/\\") || path.includes("\\");
}

export function safeNextPath(input: unknown): string | null {
  if (typeof input !== "string" || input.length === 0 || input.length > 2048) return null;
  if (!input.startsWith("/") || looksExternal(input)) return null;
  // Управляющие символы (табуляция, перевод строки) браузер вырезает из URL.
  if (/[\u0000-\u001f\u007f]/.test(input)) return null;
  let url: URL;
  try {
    url = new URL(input, BASE);
  } catch {
    return null;
  }
  if (url.origin !== BASE) return null;
  const path = `${url.pathname}${url.search}${url.hash}`;
  // После нормализации «/.//host» и «/x/..//host» превращаются в «//host». Поэтому принимаем
  // только путь, который нормализация не изменила, и ещё раз проверяем результат.
  if (path !== input || looksExternal(path)) return null;
  // Обратно на страницу входа не отправляем.
  if (url.pathname === "/login") return null;
  return path;
}
