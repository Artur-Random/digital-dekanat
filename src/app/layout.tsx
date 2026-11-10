import "@fontsource-variable/golos-text";
import "./globals.css";

import type { Metadata, Viewport } from "next";

import { ConceptBanner } from "@/components/ConceptBanner";

export const metadata: Metadata = {
  title: {
    default: "Кабинет, который предупреждает заранее",
    template: "%s · Кабинет, который предупреждает заранее",
  },
  description: "Концепт личного кабинета студента для конкурса MGIMO AI Challenge 2026.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
        {children}
      </body>
    </html>
  );
}
