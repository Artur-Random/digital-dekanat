import { describe, expect, it } from "vitest";

import { moscowDateTime } from "@/lib/moscow-date";
import { APPLICATION_TYPES } from "@/server/dal/demo/application-types";
import { HOLIDAYS } from "@/server/dal/demo/holidays";

import { type ActionFeedContext, buildActionFeed } from "./action-feed";
import { parseStages } from "./application-stages";
import { bellByPair } from "./bells";
import { buildCalendar } from "./working-days";

const calendar = buildCalendar(HOLIDAYS);
const at = (date: string, time: string) => moscowDateTime(date, time);

function stagesOf(code: string) {
  const type = APPLICATION_TYPES.find((t) => t.code === code);
  if (!type) throw new Error(code);
  return parseStages(type.stages);
}

function ctx(overrides: Partial<ActionFeedContext> = {}): ActionFeedContext {
  return {
    calendar,
    student: { studyForm: "FULL_TIME", funding: "BUDGET" },
    events: [],
    changes: [],
    applications: [],
    debts: [],
    ...overrides,
  };
}

const now = at("2026-11-23", "08:00");

describe("лента «Нужно сделать»", () => {
  it("порядок: сначала «сегодня», потом «скоро», потом «позже»; внутри — по сроку", () => {
    const room = {
      id: "e-room",
      type: "SEMINAR" as const,
      startsAt: at("2026-11-23", bellByPair(2).start),
      endsAt: at("2026-11-23", bellByPair(2).end),
      discipline: "Общая психология",
      teacher: "А",
      room: "412",
      platform: null,
      format: "OFFLINE" as const,
    };
    const retake = {
      ...room,
      id: "e-retake",
      type: "RETAKE_1" as const,
      startsAt: at("2026-12-02", bellByPair(6).start),
      endsAt: at("2026-12-02", bellByPair(6).end),
      discipline: "Анатомия",
    };
    const feed = buildActionFeed(
      now,
      ctx({
        events: [room, retake],
        changes: [
          {
            eventId: "e-room",
            field: "ROOM",
            oldValue: "305",
            newValue: "412",
            reason: "Ремонт",
            createdAt: at("2026-11-20", "15:00"),
          },
        ],
        applications: [
          {
            id: "a1",
            typeCode: "CERT_ENROLLMENT",
            title: "Справка о подтверждении обучения",
            status: "READY",
            branch: "MAIN",
            stageDeadline: null,
            stages: stagesOf("CERT_ENROLLMENT"),
            unitName: "Учебный отдел МФЦ",
          },
          {
            id: "a2",
            typeCode: "CERT_SUMMONS",
            title: "Справка-вызов",
            status: "IN_PROGRESS",
            branch: "MAIN",
            stageDeadline: new Date("2026-11-25T00:00:00Z"),
            stages: stagesOf("CERT_SUMMONS"),
            unitName: "Учебный отдел МФЦ",
          },
        ],
      }),
    );
    expect(feed.map((i) => [i.kind, i.urgency])).toEqual([
      ["schedule-change", "today"],
      ["application-progress", "soon"],
      ["application-ready", "soon"],
      ["retake", "later"],
    ]);
    const retakeItem = feed.find((i) => i.kind === "retake");
    expect(retakeItem?.title).toBe("Пересдача по дисциплине «Анатомия» через 9 дней");
    expect(retakeItem?.normCodes).toEqual(["N-17", "N-14"]);
    expect(feed.find((i) => i.kind === "application-ready")?.title).toBe(
      "Справка готова, забрать в МФЦ",
    );
  });

  it("у справки в работе срок — допущение прототипа (X-3), без чипа нормы", () => {
    const feed = buildActionFeed(
      now,
      ctx({
        applications: [
          {
            id: "a2",
            typeCode: "CERT_SUMMONS",
            title: "Справка-вызов",
            status: "IN_PROGRESS",
            branch: "MAIN",
            stageDeadline: new Date("2026-11-25T00:00:00Z"),
            stages: stagesOf("CERT_SUMMONS"),
            unitName: "Учебный отдел МФЦ",
          },
        ],
      }),
    );
    expect(feed[0]?.prototypeAssumption).toBe(true);
    expect(feed[0]?.normCodes).toEqual([]);
  });

  it("пересдача дальше 14 дней не попадает в ленту", () => {
    const far = {
      id: "far",
      type: "RETAKE_1" as const,
      startsAt: at("2026-12-10", "17:10"),
      endsAt: at("2026-12-10", "18:30"),
      discipline: "Анатомия",
      teacher: "А",
      room: "226",
      platform: null,
      format: "OFFLINE" as const,
    };
    expect(buildActionFeed(now, ctx({ events: [far] }))).toEqual([]);
  });

  it("задолженность появляется в ленте со сроком по N-10 и ссылкой на S3a", () => {
    const feed = buildActionFeed(
      now,
      ctx({
        debts: [
          { assessmentId: "as1", discipline: "Анатомия", stage: "STAGE_1", deadline: "2027-06-15" },
        ],
      }),
    );
    expect(feed).toHaveLength(1);
    expect(feed[0]).toMatchObject({
      kind: "debt",
      title: "Задолженность по дисциплине «Анатомия»: ликвидировать до 15 июня 2027",
      normCodes: ["N-10", "N-17"],
      href: "/study/as1",
      urgency: "later",
    });
  });

  it("окна повышенной стипендии в ленте нет (оно в S3)", () => {
    expect(buildActionFeed(moscowDateTime("2027-02-15", "12:00"), ctx())).toEqual([]);
  });
});
