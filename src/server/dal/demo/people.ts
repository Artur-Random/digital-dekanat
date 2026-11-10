// Демо-аккаунты. Все ФИО, группы и профили вымышленные (docs/spec-v1.md, раздел 5).
// Пароли берутся только из переменных окружения DEMO_PASSWORD_*.

import type { EducationLevelCode, Funding, StudyForm, UnitCode } from "@/generated/prisma/client";

export const INSTITUTE = "Институт психологии и комплексной реабилитации";

export type StudentSeed = {
  login: "alina" | "denis";
  passwordEnv: string;
  fullName: string;
  programCode: string;
  programName: string;
  profile: string;
  level: EducationLevelCode;
  studyForm: StudyForm;
  funding: Funding;
  course: number;
  group: string;
};

export type StaffSeed = {
  login: "mfc" | "dekanat";
  passwordEnv: string;
  fullName: string;
  position: string;
  unit: UnitCode;
};

export const GROUPS = [
  { code: "ПС-251", level: "BACHELOR", course: 2 },
  { code: "МП-261", level: "SPECIALIZED_MASTER", course: 1 },
] as const satisfies readonly { code: string; level: EducationLevelCode; course: number }[];

export const STUDENTS: readonly StudentSeed[] = [
  {
    login: "alina",
    passwordEnv: "DEMO_PASSWORD_ALINA",
    fullName: "Морозова Алина Викторовна",
    programCode: "37.03.01",
    programName: "Психология",
    profile: "Психологическое консультирование",
    level: "BACHELOR",
    studyForm: "FULL_TIME",
    funding: "BUDGET",
    course: 2,
    group: "ПС-251",
  },
  {
    login: "denis",
    passwordEnv: "DEMO_PASSWORD_DENIS",
    fullName: "Ветров Денис Андреевич",
    programCode: "37.04.01",
    programName: "Психология",
    profile: "Психология развития личности",
    level: "SPECIALIZED_MASTER",
    studyForm: "FULL_TIME",
    funding: "CONTRACT",
    course: 1,
    group: "МП-261",
  },
];

export const STAFF: readonly StaffSeed[] = [
  {
    login: "mfc",
    passwordEnv: "DEMO_PASSWORD_MFC",
    fullName: "Ланская Вера Олеговна",
    position: "Ведущий специалист учебного отдела МФЦ",
    unit: "MFC",
  },
  {
    login: "dekanat",
    passwordEnv: "DEMO_PASSWORD_DEKANAT",
    fullName: "Тихомиров Глеб Арсеньевич",
    position: "Специалист деканата",
    unit: "DEKANAT",
  },
];

export const UNITS = [
  { code: "MFC", name: "Учебный отдел МФЦ" },
  { code: "DEKANAT", name: "Деканат" },
  { code: "MILITARY", name: "Отдел воинского учёта" },
] as const satisfies readonly { code: UnitCode; name: string }[];

// rulesFilled: для каких уровней в прототипе заполнены правила аттестации. 426общ (N-01)
// распространяется и на специалитет, и на базовое ВО; false у них — сужение MVP, а не норма.
export const EDUCATION_LEVELS = [
  { code: "BACHELOR", name: "Бакалавриат", rulesFilled: true },
  { code: "SPECIALIST", name: "Специалитет", rulesFilled: false },
  { code: "MASTER", name: "Магистратура", rulesFilled: true },
  {
    code: "SPECIALIZED_MASTER",
    name: "Специализированное высшее образование (программа магистратуры)",
    rulesFilled: true,
  },
  { code: "BASIC_HE", name: "Базовое высшее образование", rulesFilled: false },
  { code: "SPO", name: "Среднее профессиональное образование", rulesFilled: false },
  { code: "POSTGRAD", name: "Аспирантура", rulesFilled: false },
  { code: "ASSISTANTSHIP", name: "Ассистентура-стажировка", rulesFilled: false },
] as const satisfies readonly { code: EducationLevelCode; name: string; rulesFilled: boolean }[];
