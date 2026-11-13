// Подстановка значений в тексты правил из таблицы Rule: «до {deadline}» → «до 15 июня 2027».

export type RuleText = {
  trigger: string;
  body: string;
  normCodes: string[];
  stipendOnly: boolean;
};

export class RuleTextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuleTextError";
  }
}

/** Заполняет {имя} значениями. Неизвестная или пропущенная подстановка — ошибка, а не «{deadline}» на экране. */
export function renderRule(body: string, vars: Readonly<Record<string, string>>): string {
  return body.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = vars[name];
    if (value === undefined) throw new RuleTextError(`Нет значения для {${name}}`);
    return value;
  });
}
