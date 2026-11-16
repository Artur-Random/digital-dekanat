import { ChevronRight, Info } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BackButton } from "@/components/BackButton";
import { requireStudent } from "@/server/auth/guards";
import { ApplicationLimitNotice } from "@/components/ApplicationLimitNotice";
import { getApplicationLimitView, listApplicationCatalog } from "@/server/dal/applications";
import { isLimitExempt } from "@/server/rules/application-stages";

export const metadata: Metadata = { title: "Новая заявка" };

// S4a, шаг 1: каталог. «Не смогу прийти» — отдельный мастер S5 (заявление о продлении).
function hrefFor(code: string): string {
  return code === "PA_EXTENSION" ? "/cant-attend" : `/applications/new/${code}`;
}

export default async function NewApplicationPage() {
  const actor = await requireStudent();
  const [catalog, limit] = await Promise.all([
    listApplicationCatalog(actor),
    getApplicationLimitView(actor),
  ]);
  // При лимите в каталоге остаются только заявления вне лимита («Не смогу прийти»).
  const forms = catalog.filter(
    (t) => !t.isInformational && (!limit.reached || isLimitExempt(t.code)),
  );
  const info = catalog.filter((t) => t.isInformational);
  const groups = [
    { title: "Справки в МФЦ", items: forms.filter((t) => t.code.startsWith("CERT_")) },
    { title: "Заявления", items: forms.filter((t) => !t.code.startsWith("CERT_")) },
  ].filter((g) => g.items.length > 0);

  return (
    <>
      <BackButton fallbackHref="/applications" />
      <h1 className="mt-2 text-2xl font-semibold">Новая заявка</h1>
      <p className="text-ink-muted mt-2">Выберите, что нужно оформить.</p>
      {limit.reached ? <ApplicationLimitNotice text={limit.text} showLink /> : null}
      {groups.length === 0 ? (
        <p className="text-ink-muted mt-4">Для вашего уровня образования заявок пока нет.</p>
      ) : (
        groups.map((g) => (
          <section key={g.title} aria-label={g.title} className="mt-6">
            <h2 className="text-lg font-semibold">{g.title}</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {g.items.map((t) => (
                <li key={t.code}>
                  <Link
                    href={hrefFor(t.code)}
                    data-testid="catalog-item"
                    data-code={t.code}
                    className="border-border hover:bg-surface-muted flex min-h-11 items-center justify-between gap-3 rounded-md border p-3"
                  >
                    <span>
                      <span className="block font-medium">
                        {t.code === "PA_EXTENSION"
                          ? `Не смогу прийти: ${t.title.toLowerCase()}`
                          : t.title}
                      </span>
                      <span className="text-ink-muted block text-sm">
                        Обрабатывает: {t.unit.name}
                      </span>
                    </span>
                    <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
      {info.map((t) => (
        <section
          key={t.code}
          aria-label={t.title}
          className="border-border mt-6 rounded-md border p-3"
          data-testid="catalog-info"
        >
          <h2 className="flex items-center gap-2 font-semibold">
            <Info aria-hidden="true" className="size-5 shrink-0" />
            {t.title}
          </h2>
          {t.description ? <p className="text-ink-muted mt-1">{t.description}</p> : null}
        </section>
      ))}
      <p className="text-ink-muted mt-6">
        Остальные заявления и справки пока подаются в текущем личном кабинете МГПУ.
      </p>
    </>
  );
}
