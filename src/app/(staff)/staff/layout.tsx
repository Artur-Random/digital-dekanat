import { ListTodo, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Logo } from "@/components/Logo";
import { WhyLink } from "@/components/WhyLink";
import { LogoutButton } from "@/components/LogoutButton";
import { requireStaff } from "@/server/auth/guards";
import { getStaffProfile } from "@/server/dal/staff";
import { BackToTop } from "@/components/BackToTop";

// Guard в layout только скрывает оболочку. Каждая страница вызывает requireStaff() сама.
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireStaff();
  const profile = await getStaffProfile(actor);
  if (!profile) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-border border-b">
        <div className="safe-x mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 py-1">
          <div className="flex min-h-11 flex-wrap items-center gap-x-3">
            <Logo />
            <span className="text-ink-muted" data-testid="staff-unit">
              {profile.unit.name}
            </span>
          </div>
          <nav aria-label="Разделы сотрудника" className="flex items-center gap-1">
            <Link
              href="/staff"
              className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 font-medium"
            >
              <ListTodo aria-hidden="true" className="size-5" />
              Очередь
            </Link>
            <WhyLink />
            <Link
              href="/staff/profile"
              aria-label="Профиль"
              className="text-ink-muted hover:text-ink inline-flex size-11 items-center justify-center rounded-md"
            >
              <UserRound aria-hidden="true" className="size-5" />
            </Link>
            <LogoutButton variant="icon" />
          </nav>
        </div>
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="safe-x mx-auto w-full max-w-5xl flex-1 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
      >
        {children}
      </main>
      <BackToTop />
    </div>
  );
}
