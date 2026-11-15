import { describe, expect, it } from "vitest";

import { HOLIDAYS } from "@/server/dal/demo/holidays";

import {
  absenceNoticeDeadline,
  leaveBranch,
  leaveExpulsionWarning,
  parseAbsenceForm,
  parseCertificateForm,
  parseLeaveForm,
} from "./application-forms";
import { buildCalendar } from "./working-days";

const calendar = buildCalendar(HOLIDAYS);
const reasons = ["ILLNESS", "OTHER"];
const EVENT = "cmhzk0d6a0000a1b2c3d4e5f6";

describe("форма справки", () => {
  it("куда и сколько экземпляров обязательны", () => {
    const r = parseCertificateForm({ destination: " ", copies: "0" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["copies", "destination"]);
  });
  it("валидная форма", () => {
    expect(parseCertificateForm({ destination: "По месту работы", copies: "2" })).toEqual({
      ok: true,
      data: { destination: "По месту работы", copies: 2 },
    });
  });
});

describe("академический отпуск", () => {
  it("ветка А только при военной службе или медпоказаниях с документами (N-43, N-44)", () => {
    expect(leaveBranch("MEDICAL", true)).toBe("A");
    expect(leaveBranch("MEDICAL", false)).toBe("B");
    expect(leaveBranch("FAMILY", true)).toBe("B");
  });
  it("срок: до 12 месяцев, по военной службе и медпоказаниям до 24 (N-41)", () => {
    expect(parseLeaveForm({ basis: "FAMILY", months: "13" }).ok).toBe(false);
    expect(parseLeaveForm({ basis: "MILITARY", hasDocuments: "on", months: "24" })).toEqual({
      ok: true,
      data: { basis: "MILITARY", hasDocuments: true, months: 24, branch: "A" },
    });
  });
  it("без галочки о документах (ключа нет в FormData) — ветка Б", () => {
    expect(parseLeaveForm({ basis: "FAMILY", months: "6" })).toEqual({
      ok: true,
      data: { basis: "FAMILY", hasDocuments: false, months: 6, branch: "B" },
    });
  });
  it("пустой срок — понятная ошибка", () => {
    const r = parseLeaveForm({ basis: "FAMILY", months: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.months).toBe("Укажите срок в месяцах.");
  });
  it("предупреждение N-49 только при долге на этапе II", () => {
    expect(leaveExpulsionWarning([])).toBe(false);
    expect(leaveExpulsionWarning([{ stage: "STAGE_1" }])).toBe(false);
    expect(leaveExpulsionWarning([{ stage: "STAGE_1" }, { stage: "STAGE_2" }])).toBe(true);
  });
  it("без основания — ошибка", () => {
    const r = parseLeaveForm({ months: "3" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.basis).toBeDefined();
  });
});

describe("«Не смогу прийти»", () => {
  const base = {
    eventId: EVENT,
    reason: "ILLNESS",
    absenceFrom: "2026-11-16",
    absenceTo: "2026-11-18",
    willBringOriginal: "on",
  };

  it("срок — 3 рабочих дня после даты контроля (N-04)", () => {
    // Пятница 13.11 → среда 18.11.
    expect(absenceNoticeDeadline("2026-11-13", calendar)).toBe("2026-11-18");
  });

  it("валидное заявление", () => {
    const r = parseAbsenceForm(base, {
      controlDay: "2026-11-17",
      reasons,
      today: "2026-11-17",
      calendar,
    });
    expect(r.ok).toBe(true);
  });

  it("срок сообщить прошёл", () => {
    const r = parseAbsenceForm(base, {
      controlDay: "2026-11-17",
      reasons,
      today: "2026-11-23",
      calendar,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.eventId).toContain("прошёл");
  });

  it("контроль вне периода отсутствия, неизвестная причина, нет отметки об оригинале", () => {
    const r = parseAbsenceForm(
      { ...base, reason: "VACATION", willBringOriginal: undefined },
      { controlDay: "2026-11-20", reasons, today: "2026-11-17", calendar },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["willBringOriginal"]);
    const r2 = parseAbsenceForm(
      { ...base, reason: "VACATION" },
      { controlDay: "2026-11-20", reasons, today: "2026-11-17", calendar },
    );
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(Object.keys(r2.errors).sort()).toEqual(["absenceFrom", "reason"]);
  });

  it("нет отметки об оригинале (ключа нет в FormData) — понятная ошибка", () => {
    const { willBringOriginal: _omit, ...rest } = base;
    void _omit;
    const r = parseAbsenceForm(rest, {
      controlDay: "2026-11-17",
      reasons,
      today: "2026-11-17",
      calendar,
    });
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.errors.willBringOriginal).toBe("Отметьте, что принесёте оригинал документа.");
  });

  it("дата окончания раньше начала", () => {
    const r = parseAbsenceForm(
      { ...base, absenceFrom: "2026-11-18", absenceTo: "2026-11-16" },
      { controlDay: "2026-11-17", reasons, today: "2026-11-17", calendar },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.absenceTo).toBeDefined();
  });
});
