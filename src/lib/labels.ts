// Подписи перечислений для интерфейса.

import type { ApplicationStatus, Funding, StudyForm } from "@/generated/prisma/enums";

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  SUBMITTED: "Подано",
  IN_PROGRESS: "Готовится",
  READY: "Готова к выдаче",
  UNDER_REVIEW: "На рассмотрении",
  SENT_TO_COMMISSION: "Передано в комиссию",
  APPROVED: "Одобрено",
  REJECTED: "Отказ",
  ORDER_SIGNED: "Распоряжение подписано",
  CANCELLED: "Отменено",
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
