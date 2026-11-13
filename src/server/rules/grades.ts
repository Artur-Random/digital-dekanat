// Оценка по баллу БРС (N-02: 100-балльная шкала; N-03: соответствие баллов и оценок).
// Шкала берётся из таблицы GradeBand уровня, а не из кода.

import type { ControlForm, EducationLevelCode, GradeValue } from "@/generated/prisma/enums";

export type GradeBandInput = {
  levelCode: EducationLevelCode;
  controlForm: ControlForm;
  minScore: number;
  maxScore: number;
  grade: GradeValue;
  isPositive: boolean;
};

export type GradeResult = { grade: GradeValue; isPositive: boolean };

export const GRADE_LABEL: Record<GradeValue, string> = {
  EXCELLENT: "отлично",
  GOOD: "хорошо",
  SATISFACTORY: "удовлетворительно",
  UNSATISFACTORY: "неудовлетворительно",
  PASSED: "зачтено",
  FAILED: "не зачтено",
};

export const CONTROL_FORM_LABEL: Record<ControlForm, string> = {
  EXAM: "Экзамен",
  DIFF_CREDIT: "Дифференцированный зачёт",
  CREDIT: "Зачёт",
};

export function gradeFor(
  score: number,
  controlForm: ControlForm,
  levelCode: EducationLevelCode,
  bands: readonly GradeBandInput[],
): GradeResult {
  if (!Number.isInteger(score) || score < 0 || score > 100) {
    throw new Error(`Балл БРС должен быть целым от 0 до 100: ${score}`);
  }
  const band = bands.find(
    (b) =>
      b.levelCode === levelCode &&
      b.controlForm === controlForm &&
      b.minScore <= score &&
      score <= b.maxScore,
  );
  if (!band) throw new Error(`Нет шкалы для ${levelCode}/${controlForm} и балла ${score}`);
  return { grade: band.grade, isPositive: band.isPositive };
}
