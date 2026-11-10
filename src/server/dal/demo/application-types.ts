// Типы заявок и их этапы. Сроки со ссылкой на норму из реестра или с пометкой
// PROTOTYPE_ASSUMPTION (X-3, X-4 в docs/norms-registry.md): «так устроено в прототипе».

import type { ApplicationTypeCode, UnitCode } from "@/generated/prisma/client";
import type { StageBranch } from "@/server/rules/application-stages";

type FormField = {
  name: string;
  label: string;
  kind: "text" | "number" | "date" | "select" | "checkbox";
  required: boolean;
};
type RequiredDocument = { title: string; normCode: string | null };

export type ApplicationTypeSeed = {
  code: ApplicationTypeCode;
  title: string;
  unit: UnitCode;
  isInformational: boolean;
  description: string | null;
  stages: StageBranch[];
  formFields: FormField[];
  requiredDocuments: RequiredDocument[];
  normCodes: string[];
};

const X3 = { kind: "PROTOTYPE_ASSUMPTION", code: "X-3" } as const;
const X4 = { kind: "PROTOTYPE_ASSUMPTION", code: "X-4" } as const;

function certificateStages(): StageBranch[] {
  return [
    {
      code: "MAIN",
      title: "Справка",
      stages: [
        {
          status: "SUBMITTED",
          title: "Подано",
          deadlineDays: null,
          countFrom: null,
          basis: null,
          canReject: false,
        },
        {
          status: "IN_PROGRESS",
          title: "Готовится",
          deadlineDays: null,
          countFrom: null,
          basis: null,
          canReject: false,
        },
        // X-3: 3 рабочих дня от подачи до готовности, нормы в пакете нет.
        {
          status: "READY",
          title: "Готова к выдаче в МФЦ",
          deadlineDays: 3,
          countFrom: "SUBMITTED",
          basis: X3,
          canReject: false,
        },
      ],
    },
  ];
}

const certificateFields: FormField[] = [
  { name: "destination", label: "Куда предоставляется", kind: "text", required: true },
  { name: "copies", label: "Количество экземпляров", kind: "number", required: true },
];

// Перечень документов дословно по N-06 (п. 5.3.2).
const ABSENCE_DOCUMENTS: RequiredDocument[] = [
  "справка о временной нетрудоспособности/лист нетрудоспособности обучающегося с указанием сроков временной нетрудоспособности",
  "документ, подтверждающий необходимость осуществления ухода за близким членом семьи с указанием сроков",
  "документ, подтверждающий участие обучающегося в спортивных соревнованиях с указанием дат проведения соревнований",
  "документ, подтверждающий направление обучающегося на стажировку с указанием сроков стажировки",
  "документ, свидетельствующий об обстоятельствах форс-мажора (о произошедшем стихийном бедствии, участии в дорожно-транспортном происшествии, об оказании содействия правоохранительным органам в качестве понятого и т.п.)",
  "документ, подтверждающий направление обучающегося работодателем в служебную командировку с указанием сроков командировки",
  "иные документы, подтверждающие уважительную причину",
].map((title) => ({ title, normCode: "N-06" }));

export const APPLICATION_TYPES: readonly ApplicationTypeSeed[] = [
  {
    code: "CERT_ENROLLMENT",
    title: "Справка о подтверждении обучения",
    unit: "MFC",
    isInformational: false,
    description: null,
    stages: certificateStages(),
    formFields: certificateFields,
    requiredDocuments: [],
    normCodes: [],
  },
  {
    code: "CERT_GRADES",
    title: "Справка об академической успеваемости",
    unit: "MFC",
    isInformational: false,
    description: null,
    stages: certificateStages(),
    formFields: certificateFields,
    requiredDocuments: [],
    normCodes: [],
  },
  {
    code: "CERT_SUMMONS",
    title: "Справка-вызов",
    unit: "MFC",
    isInformational: false,
    description: null,
    stages: certificateStages(),
    formFields: certificateFields,
    requiredDocuments: [],
    normCodes: [],
  },
  {
    code: "CERT_MILITARY",
    title: "Справка для военкомата",
    unit: "MILITARY",
    isInformational: true,
    description:
      "Оформляется через отдельный сервис отдела воинского учёта. В этом кабинете формы нет (так устроено в прототипе).",
    stages: [],
    formFields: [],
    requiredDocuments: [],
    normCodes: [],
  },
  {
    code: "PA_EXTENSION",
    title: "Продление срока промежуточной аттестации",
    unit: "DEKANAT",
    isInformational: false,
    description: null,
    stages: [
      {
        code: "MAIN",
        title: "Заявление о продлении",
        stages: [
          {
            status: "SUBMITTED",
            title: "Подано",
            deadlineDays: null,
            countFrom: null,
            basis: null,
            canReject: false,
          },
          // X-4: нормы о сроке рассмотрения нет, 5 рабочих дней — допущение прототипа.
          {
            status: "APPROVED",
            title: "Решение деканата",
            deadlineDays: 5,
            countFrom: "SUBMITTED",
            basis: X4,
            canReject: true,
          },
          {
            status: "ORDER_SIGNED",
            title: "Распоряжение подписано",
            deadlineDays: null,
            countFrom: null,
            basis: { kind: "NORM", code: "N-05" },
            canReject: false,
          },
        ],
      },
    ],
    formFields: [
      { name: "event", label: "Экзамен или пересдача", kind: "select", required: true },
      { name: "reason", label: "Уважительная причина", kind: "select", required: true },
      { name: "absenceFrom", label: "Отсутствовал с", kind: "date", required: true },
      { name: "absenceTo", label: "Отсутствовал по", kind: "date", required: true },
    ],
    requiredDocuments: ABSENCE_DOCUMENTS,
    normCodes: ["N-04", "N-05", "N-06", "N-07", "N-16"],
  },
  {
    code: "ACADEMIC_LEAVE",
    title: "Академический отпуск",
    // Решение Кирилла от 10.11: тип ведёт учебный отдел МФЦ. Для ветки Б это N-45 (МФЦ направляет
    // заявление в комиссию); для ветки А и для отметки решений ректора и комиссии — так устроено
    // в прототипе. Ссылку на N-45 в интерфейсе показывать только у этапа «Передано в комиссию».
    unit: "MFC",
    isInformational: false,
    description: null,
    stages: [
      {
        code: "A",
        title: "Военная служба или медицинские показания",
        stages: [
          {
            status: "SUBMITTED",
            title: "Подано",
            deadlineDays: null,
            countFrom: null,
            basis: null,
            canReject: false,
          },
          // N-43: 10 рабочих дней даны на решение; срока на приказ в N-43 нет.
          {
            status: "APPROVED",
            title: "Решение",
            deadlineDays: 10,
            countFrom: "SUBMITTED",
            basis: { kind: "NORM", code: "N-43" },
            canReject: true,
          },
          {
            status: "ORDER_SIGNED",
            title: "Приказ",
            deadlineDays: null,
            countFrom: null,
            basis: { kind: "NORM", code: "N-43" },
            canReject: false,
          },
        ],
      },
      {
        code: "B",
        title: "Через комиссию",
        stages: [
          {
            status: "SUBMITTED",
            title: "Подано",
            deadlineDays: null,
            countFrom: null,
            basis: null,
            canReject: false,
          },
          {
            status: "SENT_TO_COMMISSION",
            title: "Передано в комиссию",
            deadlineDays: 2,
            countFrom: "SUBMITTED",
            basis: { kind: "NORM", code: "N-45" },
            canReject: false,
          },
          {
            status: "APPROVED",
            title: "Решение комиссии",
            deadlineDays: 5,
            countFrom: "PREVIOUS",
            basis: { kind: "NORM", code: "N-46" },
            canReject: true,
          },
          {
            status: "ORDER_SIGNED",
            title: "Приказ",
            deadlineDays: 5,
            countFrom: "PREVIOUS",
            basis: { kind: "NORM", code: "N-48" },
            canReject: false,
          },
        ],
      },
    ],
    formFields: [
      { name: "basis", label: "Основание", kind: "select", required: true },
      { name: "months", label: "Срок отпуска, месяцев", kind: "number", required: true },
    ],
    requiredDocuments: [],
    normCodes: ["N-40", "N-41", "N-42", "N-43", "N-44", "N-45", "N-46", "N-48", "N-49"],
  },
];
