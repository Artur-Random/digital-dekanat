"use client";

import { ErrorState } from "@/components/ErrorState";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

// Детали ошибки не показываем: они только в серверном логе.
export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="safe-x mx-auto w-full max-w-[96rem] flex-1 pt-8 pb-[calc(2rem+env(safe-area-inset-bottom))] lg:px-8"
    >
      <ErrorState reset={reset} homeHref="/" />
    </main>
  );
}
