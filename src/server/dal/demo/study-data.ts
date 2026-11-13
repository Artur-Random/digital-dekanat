// Результаты сессий и контроль текущего семестра (задание 5). Баллы БРС вымышленные;
// оценка в базе вычисляется по шкале GradeBand уровня (N-02, N-03), а не задаётся здесь.
// Даты задаются месяцем и днём относительно учебного года «сегодня» и сдвигаются
// на ближайший рабочий день по производственному календарю.

import type { ControlForm } from "@/generated/prisma/client";

import type { DisciplineKey } from "./schedule-data";

/** Дата внутри учебного года: год учебного года + смещение, месяц-день. */
export type YearDate = { yearOffset: 0 | 1 | -1; md: string };

export type PastResult = {
  discipline: DisciplineKey;
  form: ControlForm;
  score: number;
  date: YearDate;
};

export type SessionControl = {
  discipline: DisciplineKey;
  form: ControlForm;
  /** Контроль: декабрь (последняя учебная неделя) или январь. */
  when: { december: number } | { january: YearDate };
  pair: number;
};

// Алина, семестр 1 (осень прошлого учебного года, сессия в декабре и январе):
// хорошие и отличные результаты.
export const ALINA_SEMESTER_1: readonly PastResult[] = [
  { discipline: "intro", form: "CREDIT", score: 79, date: { yearOffset: -1, md: "12-22" } },
  { discipline: "russian", form: "CREDIT", score: 88, date: { yearOffset: -1, md: "12-24" } },
  { discipline: "itPsy", form: "DIFF_CREDIT", score: 83, date: { yearOffset: -1, md: "12-26" } },
  { discipline: "history", form: "EXAM", score: 86, date: { yearOffset: 0, md: "01-13" } },
  { discipline: "philosophy", form: "EXAM", score: 74, date: { yearOffset: 0, md: "01-16" } },
  { discipline: "english", form: "CREDIT", score: 76, date: { yearOffset: 0, md: "01-20" } },
];

// Алина, семестр 2 (весна, летняя сессия в июне): одна задолженность по экзамену.
export const ALINA_SEMESTER_2: readonly PastResult[] = [
  { discipline: "research", form: "CREDIT", score: 69, date: { yearOffset: 0, md: "06-05" } },
  { discipline: "english", form: "CREDIT", score: 71, date: { yearOffset: 0, md: "06-08" } },
  { discipline: "sociology", form: "DIFF_CREDIT", score: 78, date: { yearOffset: 0, md: "06-10" } },
  { discipline: "anatomy", form: "EXAM", score: 38, date: { yearOffset: 0, md: "06-15" } },
  { discipline: "personality2", form: "EXAM", score: 84, date: { yearOffset: 0, md: "06-18" } },
];

/** Дисциплина задолженности Алины. */
export const ALINA_DEBT_DISCIPLINE: DisciplineKey = "anatomy";

// Текущий семестр: зачёты в последнюю учебную неделю декабря (день недели 0 — понедельник
// этой недели), экзамены зимней сессии Алины в январе.
export const ALINA_SEMESTER_3: readonly SessionControl[] = [
  { discipline: "social", form: "CREDIT", when: { december: 0 }, pair: 2 },
  { discipline: "psychophysiology", form: "CREDIT", when: { december: 1 }, pair: 2 },
  { discipline: "english", form: "CREDIT", when: { december: 1 }, pair: 3 },
  { discipline: "experimental", form: "DIFF_CREDIT", when: { december: 2 }, pair: 2 },
  {
    discipline: "general",
    form: "EXAM",
    when: { january: { yearOffset: 1, md: "01-12" } },
    pair: 1,
  },
  {
    discipline: "development",
    form: "EXAM",
    when: { january: { yearOffset: 1, md: "01-15" } },
    pair: 1,
  },
  { discipline: "math", form: "EXAM", when: { january: { yearOffset: 1, md: "01-19" } }, pair: 1 },
];

// Денис, семестр 1 (первый курс, набор текущего года): только зачёты в декабре.
export const DENIS_SEMESTER_1: readonly SessionControl[] = [
  { discipline: "methodology", form: "CREDIT", when: { december: 0 }, pair: 6 },
  { discipline: "personality", form: "CREDIT", when: { december: 1 }, pair: 6 },
  { discipline: "qualitative", form: "CREDIT", when: { december: 1 }, pair: 7 },
  { discipline: "counseling", form: "DIFF_CREDIT", when: { december: 2 }, pair: 6 },
];
