"use client";

import { ErrorState } from "@/components/ErrorState";

// Ошибка внутри раздела: шапка и навигация остаются на месте.
export default function SectionError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState reset={reset} homeHref="/staff" />;
}
