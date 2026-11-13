import "@fontsource-variable/golos-text";
import "./globals.css";

import type { Metadata, Viewport } from "next";

import { ConceptBanner } from "@/components/ConceptBanner";
import { NavTracker } from "@/components/NavTracker";

export const metadata: Metadata = {
  title: {
    default: "Студкаб",
    template: "%s · Студкаб",
  },
  description: "Концепт личного кабинета студента для конкурса MGIMO AI Challenge 2026.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Режим «На экран Домой»: страница под вырезом, отступы через env(safe-area-inset-*).
  viewportFit: "cover",
  // Цвет плашки концепта: она верхний элемент страницы.
  themeColor: "#fff6d6",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <a
          href="#main"
          className="focus:bg-surface sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:p-2"
        >
          Перейти к содержимому
        </a>
        <ConceptBanner />
        <NavTracker />
        {children}
      </body>
    </html>
  );
}
