import Link from "next/link";

import { PrototypeNote } from "./NormChip";

/**
 * Пояснение к лимиту активных заявок. Текст — правило APPLICATION_LIMIT из таблицы Rule;
 * нормы нет, поэтому пометка «так устроено в прототипе».
 */
export function ApplicationLimitNotice({
  text,
  showLink = false,
}: {
  text: string;
  /** Ссылка к списку заявок: там можно отменить одну из них. */
  showLink?: boolean;
}) {
  return (
    <div
      className="border-warn mt-3 rounded-md border p-3"
      data-testid="application-limit"
      role="note"
    >
      <p>{text}</p>
      <PrototypeNote />
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
