import { describe, expect, it } from "vitest";

import { academicYear, formDateBounds, isWithin } from "./academic-year";

describe("учебный год и границы дат", () => {
  it("с 1 сентября по 31 августа", () => {
    expect(academicYear("2026-11-18")).toEqual({ start: "2026-09-01", end: "2027-08-31" });
    expect(academicYear("2027-03-10")).toEqual({ start: "2026-09-01", end: "2027-08-31" });
    expect(academicYear("2026-09-01")).toEqual({ start: "2026-09-01", end: "2027-08-31" });
    expect(academicYear("2026-08-31")).toEqual({ start: "2025-09-01", end: "2026-08-31" });
  });

  it("даты в формах: от начала учебного года до года вперёд", () => {
    const b = formDateBounds("2026-11-18");
    expect(b).toEqual({ min: "2026-09-01", max: "2027-11-18" });
    expect(isWithin("0230-11-18", b)).toBe(false);
    expect(isWithin("2026-08-31", b)).toBe(false);
    expect(isWithin("2026-09-01", b)).toBe(true);
    expect(isWithin("2027-11-18", b)).toBe(true);
    expect(isWithin("2027-11-19", b)).toBe(false);
    expect(isWithin("2026-02-30", b)).toBe(false);
  });
});
