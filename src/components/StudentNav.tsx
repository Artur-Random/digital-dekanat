"use client";

import { BookOpen, CalendarDays, FileText, House, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Главная", icon: House },
  { href: "/schedule", label: "Расписание", icon: CalendarDays },
  { href: "/study", label: "Учёба", icon: BookOpen },
  { href: "/applications", label: "Заявки", icon: FileText },
  { href: "/profile", label: "Профиль", icon: UserRound },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** На телефоне нижняя панель из 5 вкладок, на ПК та же структура в закреплённой колонке слева. */
export function StudentNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Разделы"
      className="border-border bg-surface safe-bottom fixed inset-x-0 bottom-0 z-20 border-t pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:self-start md:overflow-y-auto md:border-t-0 md:border-r md:p-0"
    >
      <ul className="grid grid-cols-5 md:flex md:flex-col md:gap-1 md:p-3">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-xs md:min-h-11 md:flex-row md:justify-start md:gap-3 md:rounded-md md:px-3 md:text-base ${
                  active ? "text-accent md:bg-surface-muted font-semibold" : "text-ink-muted"
                }`}
              >
                <Icon aria-hidden="true" className="size-6 md:size-5" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
