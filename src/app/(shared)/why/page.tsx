import type { Metadata } from "next";

import { BackButton } from "@/components/BackButton";
import { NormsSearch } from "@/components/NormsSearch";
import { requireUser } from "@/server/auth/guards";
import { listNorms } from "@/server/dal/norms";

export const metadata: Metadata = { title: "Почему так" };

// S8: все нормы реестра с якорями #N-xx, поиск и «Где используется».
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
        <NormsSearch norms={norms} />
      )}
    </>
  );
}
