// Демо-расписание. Преподаватели и аудитории вымышленные; названия дисциплин — типичные
// для направлений 37.03.01 и 37.04.01 (не персональные данные). Номера кабинетов
// подразделений нигде не указываются.

import type { ScheduleEventType } from "@/generated/prisma/client";

export const TEACHERS = [
  "Корнилова Ирина Степановна",
  "Белозёров Аркадий Львович",
  "Сафонова Мария Игоревна",
  "Гладков Пётр Андреевич",
  "Ермакова Наталья Юрьевна",
  "Ткаченко Ольга Владимировна",
  "Рябинин Сергей Михайлович",
  "Лаптева Дарья Константиновна",
  "Зуев Максим Олегович",
  "Полякова Елена Аркадьевна",
] as const;

export type TeacherName = (typeof TEACHERS)[number];

export const ROOMS = ["214", "305", "412", "118", "226", "331", "107", "402"] as const;
export type RoomName = (typeof ROOMS)[number];

export const DISCIPLINES = {
  general: "Общая психология",
  development: "Психология развития",
  experimental: "Экспериментальная психология",
  social: "Социальная психология",
  math: "Математические методы в психологии",
  psychophysiology: "Психофизиология",
  english: "Иностранный язык (английский)",
  anatomy: "Анатомия и физиология центральной нервной системы",
  methodology: "Методология психологического исследования",
  personality: "Современные теории развития личности",
  counseling: "Практикум по психологическому консультированию",
  qualitative: "Качественные методы в психологии",
  // Прошлые семестры Алины (задание 5).
  intro: "Введение в профессию психолога",
  history: "История психологии",
  philosophy: "Философия",
  itPsy: "Информационные технологии в психологии",
  russian: "Русский язык и культура речи",
  personality2: "Психология личности",
  sociology: "Социология",
  research: "Основы научно-исследовательской работы",
} as const;

export type DisciplineKey = keyof typeof DISCIPLINES;

export type Slot = {
  pair: number;
  discipline: DisciplineKey;
  type: ScheduleEventType;
  teacher: TeacherName;
  room: RoomName;
};

/** Недельный шаблон: индекс 1 — понедельник, 5 — пятница. */
export type WeekTemplate = Record<1 | 2 | 3 | 4 | 5, Slot[]>;

// ПС-251 (alina): 2–4 пары в день в пределах пар 1–5.
export const PS251: WeekTemplate = {
  1: [
    {
      pair: 1,
      discipline: "general",
      type: "LECTURE",
      teacher: "Корнилова Ирина Степановна",
      room: "214",
    },
    {
      pair: 2,
      discipline: "general",
      type: "SEMINAR",
      teacher: "Корнилова Ирина Степановна",
      room: "305",
    },
    {
      pair: 3,
      discipline: "english",
      type: "SEMINAR",
      teacher: "Лаптева Дарья Константиновна",
      room: "118",
    },
  ],
  2: [
    {
      pair: 2,
      discipline: "development",
      type: "LECTURE",
      teacher: "Белозёров Аркадий Львович",
      room: "214",
    },
    {
      pair: 3,
      discipline: "experimental",
      type: "SEMINAR",
      teacher: "Сафонова Мария Игоревна",
      room: "226",
    },
    {
      pair: 4,
      discipline: "math",
      type: "SEMINAR",
      teacher: "Гладков Пётр Андреевич",
      room: "331",
    },
  ],
  3: [
    {
      pair: 1,
      discipline: "social",
      type: "LECTURE",
      teacher: "Ермакова Наталья Юрьевна",
      room: "214",
    },
    {
      pair: 2,
      discipline: "psychophysiology",
      type: "LECTURE",
      teacher: "Рябинин Сергей Михайлович",
      room: "214",
    },
    {
      pair: 3,
      discipline: "social",
      type: "SEMINAR",
      teacher: "Ермакова Наталья Юрьевна",
      room: "305",
    },
    {
      pair: 4,
      discipline: "psychophysiology",
      type: "SEMINAR",
      teacher: "Рябинин Сергей Михайлович",
      room: "107",
    },
  ],
  4: [
    {
      pair: 3,
      discipline: "experimental",
      type: "LECTURE",
      teacher: "Сафонова Мария Игоревна",
      room: "214",
    },
    {
      pair: 4,
      discipline: "development",
      type: "SEMINAR",
      teacher: "Белозёров Аркадий Львович",
      room: "305",
    },
  ],
  5: [
    {
      pair: 1,
      discipline: "math",
      type: "LECTURE",
      teacher: "Гладков Пётр Андреевич",
      room: "214",
    },
    {
      pair: 2,
      discipline: "english",
      type: "SEMINAR",
      teacher: "Лаптева Дарья Константиновна",
      room: "118",
    },
    {
      pair: 3,
      discipline: "general",
      type: "SEMINAR",
      teacher: "Корнилова Ирина Степановна",
      room: "305",
    },
  ],
};

// МП-261 (denis): 1–2 пары в будни в пределах пар 6–8, другие дисциплины.
export const MP261: WeekTemplate = {
  1: [
    {
      pair: 6,
      discipline: "methodology",
      type: "LECTURE",
      teacher: "Ткаченко Ольга Владимировна",
      room: "402",
    },
    {
      pair: 7,
      discipline: "methodology",
      type: "SEMINAR",
      teacher: "Ткаченко Ольга Владимировна",
      room: "402",
    },
  ],
  2: [
    {
      pair: 7,
      discipline: "personality",
      type: "LECTURE",
      teacher: "Зуев Максим Олегович",
      room: "412",
    },
  ],
  3: [
    {
      pair: 6,
      discipline: "qualitative",
      type: "SEMINAR",
      teacher: "Полякова Елена Аркадьевна",
      room: "331",
    },
    {
      pair: 7,
      discipline: "counseling",
      type: "SEMINAR",
      teacher: "Ткаченко Ольга Владимировна",
      room: "331",
    },
  ],
  4: [
    {
      pair: 7,
      discipline: "personality",
      type: "SEMINAR",
      teacher: "Зуев Максим Олегович",
      room: "412",
    },
  ],
  5: [
    {
      pair: 6,
      discipline: "counseling",
      type: "SEMINAR",
      teacher: "Полякова Елена Аркадьевна",
      room: "402",
    },
  ],
};

/** Горизонт расписания: 4 недели назад и 4 недели вперёд от «сегодня». */
export const SCHEDULE_WEEKS_BACK = 4;
export const SCHEDULE_WEEKS_AHEAD = 4;

// Тексты объявлений деканата. Нейтральные и вымышленные: без реальных событий МГПУ,
// реальных дат мероприятий и реальных людей. Написаны Claude Code (ИИ-контент).
export const ANNOUNCEMENTS = [
  {
    groupCodes: ["ПС-251", "МП-261"],
    title: "Обновлён раздел «Почему так»",
    body: "В кабинете появился раздел «Почему так»: у каждого срока и правила есть ссылка на норму с дословной цитатой или пометка «так устроено в прототипе».",
  },
  {
    groupCodes: ["МП-261"],
    title: "Консультации по научно-исследовательской работе",
    body: "Консультации по выбору темы научно-исследовательской работы проходят после пар по средам. Запись не нужна.",
  },
] as const;

// Причины изменений расписания (вымышленные).
export const CHANGE_REASONS = {
  room: "В аудитории не работает проектор",
  cancel: "Преподаватель в командировке",
  move: "Совмещение с занятием другой группы",
  teacher: "Плановая замена преподавателя",
} as const;
