import { describe, expect, it } from "vitest";

import { APPLICATION_TYPES } from "@/server/dal/demo/application-types";
import { HOLIDAYS } from "@/server/dal/demo/holidays";

import {
  allowedTransitions,
  canStudentCancel,
  isClosed,
  nextStageDeadline,
  parseStages,
  stageTimeline,
  statusTitle,
} from "./application-stages";
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

describe("переходы и таймлайн заявки", () => {
  const branch = (code: string, b = "MAIN") => {
    const found = branches(code).find((x) => x.code === b);
    if (!found) throw new Error(`${code}/${b}`);
    return found;
  };

  it("справка: только следующий этап, отказа нет", () => {
    const main = branch("CERT_SUMMONS");
    expect(allowedTransitions(main, "SUBMITTED")).toEqual([{ to: "IN_PROGRESS", kind: "advance" }]);
    expect(allowedTransitions(main, "IN_PROGRESS")).toEqual([{ to: "READY", kind: "advance" }]);
    expect(allowedTransitions(main, "READY")).toEqual([]);
  });

  it("продление: рассмотрение, затем решение или отказ; из отказа переходов нет", () => {
    const main = branch("PA_EXTENSION");
    expect(allowedTransitions(main, "SUBMITTED")).toEqual([
      { to: "UNDER_REVIEW", kind: "advance" },
    ]);
    expect(allowedTransitions(main, "UNDER_REVIEW")).toEqual([
      { to: "APPROVED", kind: "advance" },
      { to: "REJECTED", kind: "reject" },
    ]);
    expect(allowedTransitions(main, "REJECTED")).toEqual([]);
    expect(allowedTransitions(main, "CANCELLED")).toEqual([]);
    expect(allowedTransitions(undefined, "SUBMITTED")).toEqual([]);
  });

  it("академический отпуск Б: в комиссию нельзя отказать, отказ только решением комиссии", () => {
    const b = branch("ACADEMIC_LEAVE", "B");
    expect(allowedTransitions(b, "SUBMITTED").map((t) => t.kind)).toEqual(["advance"]);
    expect(allowedTransitions(b, "SENT_TO_COMMISSION").map((t) => t.to)).toEqual([
      "APPROVED",
      "REJECTED",
    ]);
  });

  it("отмена студентом только до взятия в работу", () => {
    expect(canStudentCancel("SUBMITTED")).toBe(true);
    expect(canStudentCancel("IN_PROGRESS")).toBe(false);
    expect(canStudentCancel("UNDER_REVIEW")).toBe(false);
  });

  it("закрытые статусы", () => {
    expect(isClosed(branch("CERT_ENROLLMENT"), "READY")).toBe(true);
    expect(isClosed(branch("PA_EXTENSION"), "UNDER_REVIEW")).toBe(false);
    expect(isClosed(branch("PA_EXTENSION"), "REJECTED")).toBe(true);
  });

  it("срок справки виден сразу после подачи: этап «Оформляется» без срока пропускается", () => {
    const dates = { submitted: "2026-11-02", enteredCurrent: "2026-11-02" };
    expect(nextStageDeadline(branch("CERT_ENROLLMENT"), "SUBMITTED", dates, calendar)).toBe(
      "2026-11-06",
    );
    expect(nextStageDeadline(branch("PA_EXTENSION"), "SUBMITTED", dates, calendar)).toBe(
      "2026-11-10",
    );
  });

  it("таймлайн: пройденные этапы с датами, текущий, срок следующего", () => {
    const at = (d: string) => new Date(`${d}T10:00:00+03:00`);
    const entries = stageTimeline(
      branch("PA_EXTENSION"),
      {
        current: "UNDER_REVIEW",
        submitted: "2026-11-02",
        events: [
          { toStatus: "SUBMITTED", createdAt: at("2026-11-02") },
          { toStatus: "UNDER_REVIEW", createdAt: at("2026-11-03") },
        ],
      },
      calendar,
    );
    expect(entries.map((e) => [e.status, e.state])).toEqual([
      ["SUBMITTED", "done"],
      ["UNDER_REVIEW", "current"],
      ["APPROVED", "upcoming"],
      ["ORDER_SIGNED", "upcoming"],
    ]);
    expect(entries[2]?.due).toBe("2026-11-10");
    expect(entries[2]?.basis).toEqual({ kind: "PROTOTYPE_ASSUMPTION", code: "X-4" });
  });

  it("таймлайн отказа: этапы после точки отказа не показываются, последней строкой «Отказ»", () => {
    const at = (d: string) => new Date(`${d}T10:00:00+03:00`);
    const entries = stageTimeline(
      branch("PA_EXTENSION"),
      {
        current: "REJECTED",
        submitted: "2026-11-02",
        events: [
          { toStatus: "SUBMITTED", createdAt: at("2026-11-02") },
          { toStatus: "UNDER_REVIEW", createdAt: at("2026-11-03") },
          { toStatus: "REJECTED", createdAt: at("2026-11-04") },
        ],
      },
      calendar,
    );
    expect(entries.map((e) => [e.status, e.state])).toEqual([
      ["SUBMITTED", "done"],
      ["UNDER_REVIEW", "done"],
      ["REJECTED", "current"],
    ]);
    expect(entries[2]?.title).toBe("Отказ");
  });

  it("описание ветки без заявки: сроки в рабочих днях", () => {
    const entries = stageTimeline(branch("ACADEMIC_LEAVE", "B"), null, calendar);
    expect(entries.every((e) => e.state === "upcoming")).toBe(true);
    expect(entries[1]?.dueDays).toEqual({ days: 2, from: "SUBMITTED" });
    expect(entries[2]?.dueDays).toEqual({ days: 5, from: "PREVIOUS" });
  });
});
