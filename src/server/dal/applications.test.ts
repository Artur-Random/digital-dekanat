// Тесты с базой: подача, отмена и смена статуса заявок, проверки владельца и подразделения.

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { StaffActor, StudentActor } from "@/server/auth/guards";
import { disconnectDb, getDb } from "@/server/db";

import {
  cancelApplication,
  changeApplicationStatus,
  createApplication,
  getAbsenceContext,
} from "./applications";
import { resetDemoData } from "./demo/reset";

async function studentOf(login: "alina" | "denis"): Promise<StudentActor> {
  const s = await getDb().studentProfile.findFirstOrThrow({
    where: { user: { login } },
    select: { id: true, userId: true, funding: true, level: { select: { code: true } } },
  });
  return { userId: s.userId, studentId: s.id, levelCode: s.level.code, funding: s.funding };
}

async function staffOf(login: "mfc" | "dekanat"): Promise<StaffActor> {
  const s = await getDb().staffProfile.findFirstOrThrow({
    where: { user: { login } },
    select: { id: true, userId: true, unitId: true },
  });
  return { userId: s.userId, staffId: s.id, unitId: s.unitId };
}

async function applicationOf(login: "alina" | "denis", code: string) {
  return getDb().application.findFirstOrThrow({
    where: { student: { user: { login } }, type: { code: code as never } },
    select: { id: true, status: true },
  });
}

const NOW = new Date("2026-11-23T09:00:00+03:00");

beforeAll(async () => {
  await resetDemoData({ today: "2026-11-23" });
});

afterAll(async () => {
  await resetDemoData();
  await disconnectDb();
});

describe("подача и отмена студентом", () => {
  it("справка: подразделение и срок из типа, событие истории от студента", async () => {
    const denis = await studentOf("denis");
    const id = await createApplication(
      denis,
      {
        typeCode: "CERT_ENROLLMENT",
        branch: "MAIN",
        formData: { destination: "По месту работы", copies: 2 },
        willBringOriginal: false,
      },
      { now: NOW },
    );
    expect(id).toBeTruthy();
    const app = await getDb().application.findUniqueOrThrow({
      where: { id: id ?? "" },
      select: {
        status: true,
        studentId: true,
        stageDeadline: true,
        unit: { select: { code: true } },
        events: { select: { toStatus: true, actorUserId: true } },
      },
    });
    expect(app).toMatchObject({ status: "SUBMITTED", studentId: denis.studentId });
    expect(app.unit.code).toBe("MFC");
    // X-3: 3 рабочих дня от подачи в понедельник 23.11 → четверг 26.11.
    expect(app.stageDeadline?.toISOString().slice(0, 10)).toBe("2026-11-26");
    expect(app.events).toEqual([{ toStatus: "SUBMITTED", actorUserId: denis.userId }]);
  });

  it("информационный тип и несуществующая ветка не подаются", async () => {
    const alina = await studentOf("alina");
    expect(
      await createApplication(alina, {
        typeCode: "CERT_MILITARY",
        branch: "MAIN",
        formData: {},
        willBringOriginal: false,
      }),
    ).toBeNull();
    expect(
      await createApplication(alina, {
        typeCode: "ACADEMIC_LEAVE",
        branch: "Z",
        formData: {},
        willBringOriginal: false,
      }),
    ).toBeNull();
  });

  it("чужую заявку отменить нельзя, свою — только до взятия в работу", async () => {
    const alina = await studentOf("alina");
    const denis = await studentOf("denis");
    const leave = await applicationOf("denis", "ACADEMIC_LEAVE");
    expect(await cancelApplication(alina, leave.id)).toBe(false);
    expect((await applicationOf("denis", "ACADEMIC_LEAVE")).status).toBe("SUBMITTED");
    const summons = await applicationOf("denis", "CERT_SUMMONS");
    expect(summons.status).toBe("IN_PROGRESS");
    expect(await cancelApplication(denis, summons.id)).toBe(false);
    expect(await cancelApplication(denis, leave.id, { now: NOW })).toBe(true);
    expect((await applicationOf("denis", "ACADEMIC_LEAVE")).status).toBe("CANCELLED");
  });
});

describe("смена статуса сотрудником", () => {
  it("МФЦ не может менять заявление деканата: ответ как у несуществующей", async () => {
    const mfc = await staffOf("mfc");
    const ext = await applicationOf("alina", "PA_EXTENSION");
    expect(
      await changeApplicationStatus(mfc, { id: ext.id, to: "UNDER_REVIEW", comment: "" }),
    ).toEqual({ ok: false, error: "NOT_FOUND" });
    expect(
      await changeApplicationStatus(mfc, {
        id: "cmhzk0d6a0000a1b2c3d4e5f6",
        to: "UNDER_REVIEW",
        comment: "",
      }),
    ).toEqual({ ok: false, error: "NOT_FOUND" });
    expect((await applicationOf("alina", "PA_EXTENSION")).status).toBe("SUBMITTED");
  });

  it("недопустимый переход отклоняется", async () => {
    const dekanat = await staffOf("dekanat");
    const ext = await applicationOf("alina", "PA_EXTENSION");
    expect(
      await changeApplicationStatus(dekanat, { id: ext.id, to: "ORDER_SIGNED", comment: "" }),
    ).toEqual({ ok: false, error: "NOT_ALLOWED" });
  });

  it("рассмотрение → отказ без причины невозможен → отказ с причиной и уведомление", async () => {
    const dekanat = await staffOf("dekanat");
    const alina = await studentOf("alina");
    const ext = await applicationOf("alina", "PA_EXTENSION");
    expect(
      await changeApplicationStatus(
        dekanat,
        { id: ext.id, to: "UNDER_REVIEW", comment: "" },
        { now: NOW },
      ),
    ).toEqual({ ok: true });
    expect(
      await changeApplicationStatus(dekanat, { id: ext.id, to: "REJECTED", comment: "   " }),
    ).toEqual({ ok: false, error: "REASON_REQUIRED" });
    expect((await applicationOf("alina", "PA_EXTENSION")).status).toBe("UNDER_REVIEW");
    expect(
      await changeApplicationStatus(
        dekanat,
        { id: ext.id, to: "REJECTED", comment: "Нет документа о болезни." },
        { now: NOW },
      ),
    ).toEqual({ ok: true });
    const app = await getDb().application.findUniqueOrThrow({
      where: { id: ext.id },
      select: { status: true, stageDeadline: true, events: { orderBy: { createdAt: "asc" } } },
    });
    expect(app.status).toBe("REJECTED");
    expect(app.stageDeadline).toBeNull();
    expect(app.events.at(-1)).toMatchObject({
      fromStatus: "UNDER_REVIEW",
      toStatus: "REJECTED",
      comment: "Нет документа о болезни.",
      actorUserId: dekanat.userId,
    });
    const notices = await getDb().notification.findMany({
      where: { recipientId: alina.userId, link: `/applications/${ext.id}` },
      select: { type: true, title: true, body: true },
    });
    // Два уведомления: «На рассмотрении» и «Отказ» с причиной.
    expect(notices).toHaveLength(2);
    expect(notices.every((n) => n.type === "APPLICATION_STATUS")).toBe(true);
    const rejected = notices.find((n) => n.title.includes("Отказ"));
    expect(rejected?.body).toContain("Причина: Нет документа о болезни.");
    // Из отказа дальше хода нет.
    expect(
      await changeApplicationStatus(dekanat, { id: ext.id, to: "APPROVED", comment: "" }),
    ).toEqual({ ok: false, error: "NOT_ALLOWED" });
  });
});

describe("«Не смогу прийти»: кандидаты", () => {
  it("отменённый контроль не предлагается", async () => {
    const alina = await studentOf("alina");
    const before = await getAbsenceContext(alina, NOW);
    const first = before.candidates[0];
    expect(first).toBeDefined();
    const staff = await getDb().staffProfile.findFirstOrThrow({
      where: { user: { login: "dekanat" } },
      select: { id: true },
    });
    await getDb().scheduleChange.create({
      data: {
        eventId: first?.id ?? "",
        field: "CANCELLED",
        oldValue: "false",
        newValue: "true",
        reason: "тест",
        changedById: staff.id,
      },
    });
    const after = await getAbsenceContext(alina, NOW);
    expect(after.candidates.map((c) => c.id)).not.toContain(first?.id);
  });
});
