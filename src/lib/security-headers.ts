// Заголовки безопасности (CLAUDE.md, «Безопасность», п. 11).
// CSP базовый: всё только со своего домена, внешние запросы запрещены (п. 10).
// 'unsafe-inline' для скриптов нужен Next.js для встроенных скриптов гидрации без nonce;
// 'unsafe-eval' и ws: только в dev для React Refresh.

export type SecurityHeader = { key: string; value: string };

export function buildContentSecurityPolicy(isDev: boolean): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    // PWA: service worker и manifest только со своего домена.
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
    "connect-src": ["'self'", ...(isDev ? ["ws:"] : [])],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

export function buildSecurityHeaders(isDev: boolean): SecurityHeader[] {
  return [
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy(isDev) },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
  ];
}
