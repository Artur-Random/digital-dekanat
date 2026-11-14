// Шкала оценок по N-03 для уровней с заполненными правилами. Для базового высшего образования
// основание N-01: 426общ п. 1.1 прямо называет программы базового высшего образования.
// Источник и для сида GradeBand, и для unit-тестов gradeFor.

import type { GradeBandInput } from "@/server/rules/grades";

import { EDUCATION_LEVELS } from "./people";

const GRADED = [
  { grade: "UNSATISFACTORY", min: 0, max: 50, positive: false },
  { grade: "SATISFACTORY", min: 51, max: 65, positive: true },
  { grade: "GOOD", min: 66, max: 80, positive: true },
  { grade: "EXCELLENT", min: 81, max: 100, positive: true },
] as const;

const CREDIT = [
  { grade: "FAILED", min: 0, max: 50, positive: false },
  { grade: "PASSED", min: 51, max: 100, positive: true },
] as const;

export const GRADE_BANDS: readonly GradeBandInput[] = EDUCATION_LEVELS.filter(
  (l) => l.rulesFilled,
).flatMap((level) => [
  ...(["EXAM", "DIFF_CREDIT"] as const).flatMap((controlForm) =>
    GRADED.map((b) => ({
      levelCode: level.code,
      controlForm,
      grade: b.grade,
      minScore: b.min,
      maxScore: b.max,
      isPositive: b.positive,
    })),
  ),
  ...CREDIT.map((b) => ({
    levelCode: level.code,
    controlForm: "CREDIT" as const,
    grade: b.grade,
    minScore: b.min,
    maxScore: b.max,
    isPositive: b.positive,
  })),
]);
