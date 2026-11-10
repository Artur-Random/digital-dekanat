import { describe, expect, it } from "vitest";

import { APPLICATION_TYPES } from "@/server/dal/demo/application-types";
import { HOLIDAYS } from "@/server/dal/demo/holidays";

import { nextStageDeadline, parseStages, statusTitle } from "./application-stages";
import { buildCalendar } from "./working-days";

const calendar = buildCalendar(HOLIDAYS);

function branches(code: string) {
  const type = APPLICATION_TYPES.find((t) => t.code === code);
  if (!type) throw new Error(code);
  return parseStages(type.stages);
}

describe("этапы заявок", () => {
  it("все типы проходят схему, у каждого срока есть основание", () => {
    for (const type of APPLICATION_TYPES) {
      for (const branch of parseStages(type.stages)) {
        for (const stage of branch.stages) {
          if (stage.deadlineDays !== null)
            expect(stage.basis, `${type.code}/${stage.title}`).not.toBeNull();
        }
      }
    }
  });

  it("ORDER_SIGNED: у продления распоряжение (N-05), у академического отпуска приказ", () => {
    expect(statusTitle(branches("PA_EXTENSION"), "ORDER_SIGNED")).toBe("Распоряжение подписано");
    expect(statusTitle(branches("ACADEMIC_LEAVE"), "ORDER_SIGNED")).toBe("Приказ");
  });

  it("подпись учитывает ветку заявки", () => {
    expect(statusTitle(branches("ACADEMIC_LEAVE"), "APPROVED", "A")).toBe("Решение");
    expect(statusTitle(branches("ACADEMIC_LEAVE"), "APPROVED", "B")).toBe("Решение комиссии");
  });

  it("статус, которого нет в этапах, берёт общую подпись", () => {
    expect(statusTitle(branches("CERT_ENROLLMENT"), "CANCELLED")).toBe("Отменено");
  });

  it("справка: 3 рабочих дня от подачи (X-3), с учётом 4 ноября", () => {
    const [main] = branches("CERT_ENROLLMENT");
    if (!main) throw new Error("нет ветки");
    const dates = { submitted: "2026-11-02", enteredCurrent: "2026-11-03" };
    expect(nextStageDeadline(main, "IN_PROGRESS", dates, calendar)).toBe("2026-11-06");
    expect(nextStageDeadline(main, "READY", dates, calendar)).toBeNull();
  });

  it("академический отпуск, ветка Б: решение комиссии 5 дней от передачи (N-46)", () => {
    const b = branches("ACADEMIC_LEAVE").find((x) => x.code === "B");
    if (!b) throw new Error("нет ветки Б");
    const dates = { submitted: "2026-11-09", enteredCurrent: "2026-11-10" };
    expect(nextStageDeadline(b, "SUBMITTED", dates, calendar)).toBe("2026-11-11");
    expect(nextStageDeadline(b, "SENT_TO_COMMISSION", dates, calendar)).toBe("2026-11-17");
  });

  it("академический отпуск, ветка А: на приказ срока нет (N-43)", () => {
    const a = branches("ACADEMIC_LEAVE").find((x) => x.code === "A");
    if (!a) throw new Error("нет ветки А");
    const dates = { submitted: "2026-11-09", enteredCurrent: "2026-11-09" };
    expect(nextStageDeadline(a, "SUBMITTED", dates, calendar)).toBe("2026-11-23");
    expect(nextStageDeadline(a, "APPROVED", dates, calendar)).toBeNull();
  });
});
