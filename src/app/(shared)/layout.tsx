import Link from "next/link";

import { Logo } from "@/components/Logo";
import { requireUser } from "@/server/auth/guards";

// Экраны для студента и сотрудника (S8 «Почему так»). Каждая страница вызывает requireUser() сама.
export default async function SharedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-border border-b">
        <div className="safe-x mx-auto flex max-w-5xl items-center justify-between py-1">
          <Link
            href={user.role === "STAFF" ? "/staff" : "/"}
            className="inline-flex min-h-11 items-center"
          >
            <Logo />
          </Link>
        </div>
      </header>
      <main id="main" className="safe-x safe-bottom mx-auto w-full max-w-5xl flex-1 pt-6 pb-8">
        {children}
      </main>
    </div>
  );
}
