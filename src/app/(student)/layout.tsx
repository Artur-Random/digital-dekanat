import { Bell } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/Logo";
import { StudentNav } from "@/components/StudentNav";
import { requireStudent } from "@/server/auth/guards";

// Guard в layout только скрывает оболочку от чужих. Каждая страница всё равно вызывает
// requireStudent() сама: layout не перепроверяется при клиентской навигации.
export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireStudent();
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-border border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-1">
          <Link href="/" className="inline-flex min-h-11 items-center">
            <Logo />
          </Link>
          <Link
            href="/notifications"
            aria-label="Уведомления"
            className="text-ink-muted hover:text-ink inline-flex size-11 items-center justify-center rounded-md"
          >
            <Bell aria-hidden="true" className="size-6" />
          </Link>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-5xl flex-1">
        <StudentNav />
        {/* Нижний отступ на телефоне: контент не прячется под панелью вкладок. */}
        <main id="main" className="min-w-0 flex-1 px-4 pt-6 pb-24 md:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
