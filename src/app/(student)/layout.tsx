import { Bell } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/Logo";
import { StudentNav } from "@/components/StudentNav";
import { requireStudent } from "@/server/auth/guards";
import { countUnreadNotifications } from "@/server/dal/notifications";
import { BackToTop } from "@/components/BackToTop";

// Guard в layout только скрывает оболочку от чужих. Каждая страница всё равно вызывает
// requireStudent() сама: layout не перепроверяется при клиентской навигации.
export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireStudent();
  const unread = await countUnreadNotifications(actor);
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-border border-b">
        <div className="safe-x mx-auto flex max-w-5xl items-center justify-between py-1">
          <Link href="/" className="inline-flex min-h-11 items-center">
            <Logo />
          </Link>
          <Link
            href="/notifications"
            aria-label={`Уведомления, непрочитанных: ${unread}`}
            data-testid="bell"
            data-unread={unread}
            className="text-ink-muted hover:text-ink relative inline-flex size-11 items-center justify-center rounded-md"
          >
            <Bell aria-hidden="true" className="size-6" />
            {unread > 0 ? (
              <span
                aria-hidden="true"
                className="bg-danger absolute top-0.5 right-0.5 min-w-5 rounded-full px-1 text-center text-xs leading-5 font-semibold text-white"
              >
                {unread > 99 ? "99+" : unread}
              </span>
            ) : null}
          </Link>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-5xl flex-1">
        <StudentNav />
        {/* Нижний отступ на телефоне: контент не прячется под панелью вкладок. */}
        <main id="main" tabIndex={-1} className="safe-x pb-under-nav min-w-0 flex-1 pt-6 md:pb-8">
          {children}
        </main>
        <BackToTop aboveNav />
      </div>
    </div>
  );
}
