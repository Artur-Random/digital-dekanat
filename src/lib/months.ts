// Названия месяцев в предложном падеже: «в декабре».
const PREPOSITIONAL = [
  "январе",
  "феврале",
  "марте",
  "апреле",
  "мае",
  "июне",
  "июле",
  "августе",
  "сентябре",
  "октябре",
  "ноябре",
  "декабре",
];

/** «ГГГГ-ММ-ДД» → «декабре». */
export function monthPrepositional(key: string): string {
  return PREPOSITIONAL[Number(key.slice(5, 7)) - 1] ?? "";
}
