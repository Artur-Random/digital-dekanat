import { describe, expect, it } from "vitest";

import { moscowDateTime } from "@/lib/moscow-date";

import { firstOfNextMonth, raisedStipendWindow, stipendStatus } from "./stipend";

const budget = { studyForm: "FULL_TIME" as const, funding: "BUDGET" as const };
const now = moscowDateTime("2026-11-22", "12:00");

describe("stipendStatus (N-20, N-21, N-22, N-29)", () => {
  it("задолженность в июне — не выплачивается с 1 июля", () => {
    const s = stipendStatus(
      budget,
      [{ semester: 2, grade: "UNSATISFACTORY", date: moscowDateTime("2026-06-15", "10:00") }],
      [{ formedAt: "2026-06-15", open: true }],
      now,
    );
    expect(s).toMatchObject({ paid: false, stoppedFrom: "2026-07-01", reason: "debt" });
  });

  it("«удовлетворительно» в январе — не выплачивается с 1 февраля", () => {
    const s = stipendStatus(
      budget,
      [
        { semester: 1, grade: "GOOD", date: moscowDateTime("2027-01-12", "10:00") },
        { semester: 1, grade: "SATISFACTORY", date: moscowDateTime("2027-01-19", "10:00") },
      ],
      [],
      moscowDateTime("2027-01-25", "12:00"),
    );
    expect(s).toMatchObject({ paid: false, stoppedFrom: "2027-02-01", reason: "satisfactory" });
  });

  it("без троек и задолженностей — выплачивается", () => {
    const s = stipendStatus(
      budget,
      [{ semester: 1, grade: "EXCELLENT", date: moscowDateTime("2026-01-13", "10:00") }],
      [],
      now,
    );
    expect(s).toMatchObject({ paid: true, stoppedFrom: null });
  });

  it("контрактник и заочник — null (N-22)", () => {
    expect(stipendStatus({ studyForm: "FULL_TIME", funding: "CONTRACT" }, [], [], now)).toBeNull();
    expect(stipendStatus({ studyForm: "EXTRAMURAL", funding: "BUDGET" }, [], [], now)).toBeNull();
  });

  it("окно повышенной стипендии: ближайшее и открытое", () => {
    expect(raisedStipendWindow("2026-11-22")).toEqual({
      opens: "2027-02-05",
      closes: "2027-03-05",
      isOpen: false,
    });
    expect(raisedStipendWindow("2027-07-20").isOpen).toBe(true);
    expect(firstOfNextMonth("2026-12-10")).toBe("2027-01-01");
  });
});
