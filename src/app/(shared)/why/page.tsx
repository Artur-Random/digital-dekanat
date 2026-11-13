import type { Metadata } from "next";

import { BackButton } from "@/components/BackButton";
import { requireUser } from "@/server/auth/guards";
import { listNorms } from "@/server/dal/norms";

export const metadata: Metadata = { title: "Почему так" };

// Минимальная S8: все нормы реестра с якорями #N-xx. Поиск — в задании 5.
export default async function WhyPage() {
  const user = await requireUser();
  const norms = await listNorms(user);
  return (
    <>
      <BackButton fallbackHref={user.role === "STAFF" ? "/staff" : "/"} />
      <h1 className="mt-2 text-2xl font-semibold">Почему так</h1>
      <p className="text-ink-muted mt-2">
        Каждое правило в кабинете ссылается на пункт положения. Здесь — дословные цитаты.
      </p>
      {norms.length === 0 ? (
        <p className="text-ink-muted mt-4">Реестр норм пока пуст.</p>
      ) : (
        <ol className="mt-6 flex flex-col gap-4">
          {norms.map((n) => (
            <li
              key={n.code}
              id={n.code}
              data-testid="norm"
              className="border-border target:border-accent scroll-mt-4 rounded-md border p-4 [overflow-wrap:anywhere] target:border-2"
            >
              <h2 className="font-semibold">{n.code}</h2>
              <p className="text-ink-muted text-sm">
                {n.document}, {n.clause}
                {n.page ? `, стр. ${n.page}` : ""}
              </p>
              <blockquote className="border-border mt-2 border-l-4 pl-3">{n.quote}</blockquote>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
