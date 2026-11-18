// Государственная академическая стипендия. Показывается только очной форме и бюджету: для государственной это
// 33общ п. 2.1 (N-19), для повышенной — N-22.
// N-20: нет «удовлетворительно» по итогам последней аттестации и нет задолженностей.
// N-21: выплата прекращается с 1-го числа месяца после месяца, когда получена тройка
// или образовалась задолженность. N-29: окна подачи документов на повышенную стипендию.

import type { Funding, GradeValue, StudyForm } from "@/generated/prisma/enums";
import { type DateKey, toDateKey } from "@/lib/moscow-date";

export type StipendStudent = { studyForm: StudyForm; funding: Funding };

export type StipendAssessment = { semester: number; grade: GradeValue | null; date: Date };

export type StipendDebt = { formedAt: DateKey; open: boolean };

export type StipendStatus = {
  paid: boolean;
  /** С какого числа не выплачивается. */
  stoppedFrom: DateKey | null;
  reason: "debt" | "satisfactory" | null;
  /** Ближайшее окно подачи на повышенную стипендию (справочно). */
  raisedWindow: { opens: DateKey; closes: DateKey; isOpen: boolean };
};

export function isStipendEligible(student: StipendStudent): boolean {
  return student.studyForm === "FULL_TIME" && student.funding === "BUDGET";
}

/** Первое число месяца, следующего за месяцем даты. */
export function firstOfNextMonth(key: DateKey): DateKey {
  const [y, m] = key.split("-").map(Number) as [number, number];
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
}

export function raisedStipendWindow(today: DateKey): {
  opens: DateKey;
  closes: DateKey;
  isOpen: boolean;
} {
  const year = Number(today.slice(0, 4));
  const windows = [year, year + 1].flatMap((y) => [
    { opens: `${y}-02-05`, closes: `${y}-03-05` },
    { opens: `${y}-07-10`, closes: `${y}-08-10` },
  ]);
  const current = windows.find((w) => w.opens <= today && today <= w.closes);
  if (current) return { ...current, isOpen: true };
  const next = windows.find((w) => w.opens > today);
  if (!next) throw new Error("Нет окна подачи");
  return { ...next, isOpen: false };
}

export function stipendStatus(
  student: StipendStudent,
  assessments: readonly StipendAssessment[],
  debts: readonly StipendDebt[],
  now: Date,
): StipendStatus | null {
  if (!isStipendEligible(student)) return null;
  const today = toDateKey(now);
  // Последняя завершённая аттестация: семестр, где у всех дисциплин уже есть результат.
  // Первый зачёт следующей сессии не «обнуляет» итоги прошлой (N-21: прекращение с даты).
  const bySemester = new Map<number, StipendAssessment[]>();
  for (const a of assessments)
    bySemester.set(a.semester, [...(bySemester.get(a.semester) ?? []), a]);
  const complete = [...bySemester]
    .filter(([, list]) => list.every((a) => a.grade !== null && toDateKey(a.date) <= today))
    .map(([semester]) => semester);
  const lastSemester = Math.max(0, ...complete);
  const lastSession = bySemester.get(lastSemester) ?? [];
  const sessionStart = lastSession.map((a) => toDateKey(a.date)).sort()[0] ?? today;
  // Поводы прекращения: тройки последней аттестации, открытые задолженности и задолженности,
  // образованные в эту аттестацию (даже если уже ликвидированы: о возобновлении выплаты
  // в реестре нормы нет).
  const events: { date: DateKey; reason: "debt" | "satisfactory" }[] = [
    // Тройки последней завершённой аттестации и уже полученные тройки идущей сессии:
    // N-21 прекращает выплату с месяца после получения оценки, не дожидаясь конца сессии.
    ...assessments
      .filter(
        (a) =>
          a.grade === "SATISFACTORY" && a.semester >= lastSemester && toDateKey(a.date) <= today,
      )
      .map((a) => ({ date: toDateKey(a.date), reason: "satisfactory" as const })),
    ...debts
      .filter((d) => d.open || d.formedAt >= sessionStart)
      .map((d) => ({ date: d.formedAt, reason: "debt" as const })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const first = events[0];
  return {
    paid: !first,
    stoppedFrom: first ? firstOfNextMonth(first.date) : null,
    reason: first ? first.reason : null,
    raisedWindow: raisedStipendWindow(today),
  };
}
