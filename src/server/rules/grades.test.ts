import { describe, expect, it } from "vitest";

import { GRADE_BANDS } from "@/server/dal/demo/grade-bands";

import { gradeFor } from "./grades";

const LEVELS = ["BACHELOR", "MASTER", "SPECIALIZED_MASTER"] as const;

describe("gradeFor (N-02, N-03)", () => {
  for (const level of LEVELS) {
    for (const form of ["EXAM", "DIFF_CREDIT"] as const) {
      it(`${level}, ${form}: границы 50/51, 65/66, 80/81`, () => {
        const g = (score: number) => gradeFor(score, form, level, GRADE_BANDS);
        expect(g(0)).toEqual({ grade: "UNSATISFACTORY", isPositive: false });
        expect(g(50)).toEqual({ grade: "UNSATISFACTORY", isPositive: false });
        expect(g(51)).toEqual({ grade: "SATISFACTORY", isPositive: true });
        expect(g(65).grade).toBe("SATISFACTORY");
        expect(g(66).grade).toBe("GOOD");
        expect(g(80).grade).toBe("GOOD");
        expect(g(81).grade).toBe("EXCELLENT");
        expect(g(100).grade).toBe("EXCELLENT");
      });
    }
    it(`${level}, зачёт: 50 — не зачтено, 51 — зачтено`, () => {
      expect(gradeFor(50, "CREDIT", level, GRADE_BANDS)).toEqual({
        grade: "FAILED",
        isPositive: false,
      });
      expect(gradeFor(51, "CREDIT", level, GRADE_BANDS)).toEqual({
        grade: "PASSED",
        isPositive: true,
      });
    });
  }

  it("балл вне 0–100 и уровень без шкалы — ошибка", () => {
    expect(() => gradeFor(101, "EXAM", "BACHELOR", GRADE_BANDS)).toThrow();
    expect(() => gradeFor(-1, "EXAM", "BACHELOR", GRADE_BANDS)).toThrow();
    expect(() => gradeFor(70, "EXAM", "SPO", GRADE_BANDS)).toThrow();
  });
});
