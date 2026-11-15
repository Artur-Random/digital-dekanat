// Тексты уведомлений, которые формируются из данных (не объявления деканата).
// Тексты написаны Claude Code (ИИ-контент, docs/submission/tools.md).

import type { ApplicationStatus, ApplicationTypeCode } from "@/generated/prisma/enums";
import { moscowTime, toDateKey } from "@/lib/moscow-date";
import { formatSlot } from "@/lib/format-date";

import { pairOf } from "./bells";

export function retakeScheduleNotice(
  retake: {
    discipline: string;
    startsAt: Date;
    stage: "I" | "II";
    place: string;
  },
  /** Текст правила RETAKE_SCHEDULE_LOCKED из таблицы Rule и его нормы. */
  locked: { body: string; normCodes: string[] } | null,
): { title: string; body: string } {
  const slot = formatSlot({
    date: toDateKey(retake.startsAt),
    pair: pairOf(moscowTime(retake.startsAt)),
    start: moscowTime(retake.startsAt),
  });
  return {
    title: "Опубликовано расписание пересдач",
    body: `Пересдача (этап ${retake.stage}) по дисциплине «${retake.discipline}»: ${slot}, ${retake.place}.${
      locked ? ` ${locked.body} (${locked.normCodes.join(", ")})` : ""
    }`,
  };
}

export function applicationStatusNotice(app: {
  typeCode: ApplicationTypeCode;
  title: string;
  status: ApplicationStatus;
  statusTitle: string;
  unitName: string;
  /** Комментарий сотрудника; при отказе это причина (N-46). */
  comment?: string | null;
}): { title: string; body: string } {
  const note = app.comment
    ? ` ${app.status === "REJECTED" ? "Причина" : "Комментарий"}: ${app.comment}`
    : "";
  const place = app.unitName.includes("МФЦ") ? "в МФЦ" : "в деканате";
  if (app.status === "READY" && app.typeCode.startsWith("CERT_")) {
    return {
      title: `Справка готова, забрать ${place}`,
      body: `«${app.title}» готова к выдаче. Подробности в карточке заявки.${note}`,
    };
  }
  return {
    title: `${app.title}: ${app.statusTitle}`,
    body: `Статус заявки изменился: ${app.statusTitle}.${note}`,
  };
}
