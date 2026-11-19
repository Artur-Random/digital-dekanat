import "@/fonts/golos-text/golos-text.css";
import "./globals.css";

import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";

import { ConceptBanner } from "@/components/ConceptBanner";
import { NavTracker } from "@/components/NavTracker";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";

export const metadata: Metadata = {
  title: {
    default: "Студкаб",
    template: "%s · Студкаб",
  },
  description: "Студкаб — концепт личного кабинета студента для конкурса MGIMO AI Challenge 2026.",
  robots: { index: false, follow: false },
  // Статус-бар в режиме «На экран Домой»: тёмный текст. black-translucent даёт белый текст,
  // он не читается на светло-жёлтой полоске цвета плашки.
  appleWebApp: { statusBarStyle: "default", title: "Студкаб" },
  // iOS не берёт иконки из manifest: apple-touch-icon обязателен.
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Режим «На экран Домой»: страница под вырезом, отступы через env(safe-area-inset-*).
  viewportFit: "cover",
  // Цвет плашки концепта: она верхний элемент страницы.
  themeColor: "#fff6d6",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Тема из cookie: сервер сразу отдаёт нужный data-theme, белого мелькания нет.
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang="ru" data-theme={theme}>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <a
          href="#main"
          className="focus:bg-surface sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:p-2"
        >
          Перейти к содержимому
        </a>
        <div aria-hidden="true" data-testid="status-bar-shield" className="status-bar-shield" />
        <ConceptBanner />
        <NavTracker />
        <ServiceWorkerRegister version={process.env.APP_VERSION || "dev"} />
        {children}
      </body>
    </html>
  );
}
