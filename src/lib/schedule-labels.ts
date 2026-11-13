import type { DeliveryFormat, ScheduleEventType } from "@/generated/prisma/enums";

export const EVENT_TYPE_LABEL: Record<ScheduleEventType, string> = {
  LECTURE: "Лекция",
  SEMINAR: "Семинар",
  CREDIT: "Зачёт",
  EXAM: "Экзамен",
  RETAKE_1: "Пересдача (этап I)",
  RETAKE_2: "Пересдача (этап II, комиссия)",
};

export const FORMAT_LABEL: Record<DeliveryFormat, string> = {
  OFFLINE: "очно",
  ONLINE: "дистанционно",
};
