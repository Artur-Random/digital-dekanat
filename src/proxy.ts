import { type NextRequest, NextResponse } from "next/server";

// Proxy НЕ защищает страницы: проверку доступа делает guard в каждой странице, action и
// route handler. Здесь только передаём текущий путь, чтобы guard мог вернуть анонима на
// /login?next=<путь>. Заголовок от клиента всегда перезаписываем.
export const CURRENT_PATH_HEADER = "x-dd-current-path";

export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set(CURRENT_PATH_HEADER, `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health).*)"],
};
