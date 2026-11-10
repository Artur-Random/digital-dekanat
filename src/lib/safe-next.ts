// Защита от открытого редиректа: ?next= принимает только относительный путь внутри сайта.

const BASE = "http://internal.invalid";

export function safeNextPath(input: unknown): string | null {
  if (typeof input !== "string" || input.length === 0 || input.length > 2048) return null;
  // Только путь от корня. «//host» и «/\host» браузер понимает как адрес другого сайта.
  if (!input.startsWith("/") || input.startsWith("//")) return null;
  if (input.includes("\\")) return null;
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
  // Обратно на страницу входа не отправляем.
  if (url.pathname === "/login") return null;
  return path;
}
