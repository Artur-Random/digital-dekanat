import type { Metadata } from "next";
import { z } from "zod";

import { BackButton } from "@/components/BackButton";
import { NormsSearch } from "@/components/NormsSearch";
import { requireUser } from "@/server/auth/guards";
import { listNorms } from "@/server/dal/norms";

export const metadata: Metadata = { title: "Почему так" };

// S8: все нормы реестра с якорями #N-xx, поиск и «Где используется».
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// Начальный запрос поиска из адреса (?q=): ссылка на найденное и скриншот экрана с поиском.
const queryParam = z.string().max(100);

export default async function WhyPage({ searchParams }: Props) {
  const user = await requireUser();
  const q = queryParam.safeParse((await searchParams).q);
  const norms = await listNorms(user);
  return (
    <>
      <BackButton fallbackHref={user.role === "STAFF" ? "/staff" : "/"} />
      <h1 className="mt-2 text-2xl font-semibold">Почему так</h1>
      <p className="text-ink-muted mt-2">
        Сроки и подсказки в кабинете взяты из положений МГПУ и закона. Здесь пункты, на которых они
        основаны, дословно.
      </p>
      {norms.length === 0 ? (
        <p className="text-ink-muted mt-4">Реестр норм пока пуст.</p>
      ) : (
        <NormsSearch norms={norms} initialQuery={q.success ? q.data : ""} />
      )}
    </>
  );
}
