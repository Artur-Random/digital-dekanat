import Link from "next/link";

import { PrototypeNote } from "./NormChip";

/**
 * Пояснение к лимиту активных заявок. Текст — правило APPLICATION_LIMIT из таблицы Rule;
 * нормы нет, поэтому пометка «так устроено в прототипе».
 */
export function ApplicationLimitNotice({
  text,
  showLink = false,
  showExempt = false,
}: {
  text: string;
  /** Ссылка к списку заявок: там можно отменить одну из них. */
  showLink?: boolean;
  /** Ссылка на «Не смогу прийти»: заявление вне лимита (срок по норме, решение Кирилла 16.11). */
  showExempt?: boolean;
}) {
  return (
    <div
      className="border-warn mt-3 rounded-md border p-3"
      data-testid="application-limit"
      role="note"
    >
      <p>{text}</p>
      <PrototypeNote />
      {showExempt ? (
        <p>
          <Link
            href="/cant-attend"
            className="text-accent inline-flex min-h-11 items-center underline"
            data-testid="limit-exempt-link"
          >
            «Не смогу прийти» можно подать и сейчас
          </Link>
        </p>
      ) : null}
      {showLink ? (
        <p>
          <Link
            href="/applications"
            className="text-accent inline-flex min-h-11 items-center underline"
          >
            К моим заявкам
          </Link>
        </p>
      ) : null}
    </div>
  );
}
