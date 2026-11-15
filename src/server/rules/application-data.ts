// Данные заявления для карточки (S4b, E2): поля формы из Application.formData в виде
// «подпись — значение». Неизвестные и пустые поля не показываются.

import { formatDateKey } from "@/lib/format-date";
import { isDateKey } from "@/lib/moscow-date";

import { LEAVE_BASIS_LABEL } from "./application-forms";

type Documents = readonly { code?: string; reason?: string; title: string }[];

const LEAVE_BASIS: Record<string, string> = LEAVE_BASIS_LABEL;

function text(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}

function date(value: unknown): string | null {
  return typeof value === "string" && isDateKey(value) ? formatDateKey(value) : null;
}

export function describeFormData(
  typeCode: string,
  formData: unknown,
  documents: Documents,
): { label: string; value: string }[] {
  if (typeof formData !== "object" || formData === null || Array.isArray(formData)) return [];
  const d = formData as Record<string, unknown>;
  const rows: { label: string; value: string | null }[] = [];
  if (typeCode.startsWith("CERT_")) {
    rows.push({ label: "Куда", value: text(d.destination) });
    rows.push({ label: "Экземпляров", value: text(d.copies) });
  } else if (typeCode === "PA_EXTENSION") {
    const reason = documents.find((doc) => doc.code === d.reason);
    rows.push({ label: "Контроль", value: text(d.event) });
    rows.push({ label: "Причина", value: reason?.reason ?? null });
    rows.push({ label: "Документ", value: reason?.title ?? null });
    const from = date(d.absenceFrom);
    const to = date(d.absenceTo);
    rows.push({ label: "Отсутствие", value: from && to ? `${from} — ${to}` : null });
  } else if (typeCode === "ACADEMIC_LEAVE") {
    rows.push({ label: "Основание", value: LEAVE_BASIS[String(d.basis)] ?? null });
    rows.push({ label: "Срок, месяцев", value: text(d.months) });
  }
  return rows.flatMap((r) => (r.value ? [{ label: r.label, value: r.value }] : []));
}
