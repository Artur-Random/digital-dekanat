// Подписи перечислений для интерфейса.

import type { ApplicationStatus, Funding, StudyForm } from "@/generated/prisma/enums";

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  SUBMITTED: "Подано",
  IN_PROGRESS: "Оформляется",
  READY: "Готова к выдаче",
  UNDER_REVIEW: "На рассмотрении",
  SENT_TO_COMMISSION: "Передано в комиссию",
  APPROVED: "Одобрено",
  REJECTED: "Отказ",
  ORDER_SIGNED: "Распоряжение подписано",
  CANCELLED: "Отменено",
};

/** Подписи кнопок перехода для сотрудника (E2): в какой статус переводит кнопка. */
export const TRANSITION_LABEL: Record<ApplicationStatus, string> = {
  SUBMITTED: "Вернуть в «Подано»",
  IN_PROGRESS: "Взять в работу",
  READY: "Справка готова к выдаче",
  UNDER_REVIEW: "Взять на рассмотрение",
  SENT_TO_COMMISSION: "Передать в комиссию",
  APPROVED: "Одобрить",
  REJECTED: "Отказать",
  ORDER_SIGNED: "Отметить подписание",
  CANCELLED: "Отменить",
};

export const STUDY_FORM_LABEL: Record<StudyForm, string> = {
  FULL_TIME: "Очная",
  PART_TIME: "Очно-заочная",
  EXTRAMURAL: "Заочная",
};

export const FUNDING_LABEL: Record<Funding, string> = {
  BUDGET: "Бюджет",
  CONTRACT: "Контракт",
};
