// Парсер docs/norms-registry.md. Реестр единственный источник норм: таблица Norm
// заполняется только отсюда. Если формат записи не распознан, падаем с понятной ошибкой.

export type ParsedNorm = {
  code: string;
  document: string;
  clause: string;
  page: string | null;
  quote: string;
  /** «Где используется»: строка «Где: …» реестра без отметки «Сверено». */
  usedIn: string | null;
};

const NORM_HEADER = /^\*\*(N-\d+)\.\*\*\s*(.*)$/;
const DOCUMENT_HEADER = /^##\s+(.+)$/;

export class NormsRegistryError extends Error {
  constructor(message: string) {
    super(`Реестр норм: ${message}`);
    this.name = "NormsRegistryError";
  }
}

/** Делит «п. 2.2, стр. 4» на пункт и страницу. У норм закона страницы нет. */
function splitClause(code: string, rest: string): { clause: string; page: string | null } {
  const match = rest.match(/^(.*?),\s*стр\.\s*(\S+)\s*$/);
  if (match?.[1] && match[2]) {
    return { clause: match[1].trim(), page: match[2] };
  }
  if (!rest.trim()) {
    throw new NormsRegistryError(`${code}: после кода нет пункта документа`);
  }
  return { clause: rest.trim(), page: null };
}

/** Убирает внешние кавычки-ёлочки, внутренние сохраняет. */
function unquote(code: string, line: string): string {
  const body = line.replace(/^>\s*/, "").trim();
  if (!body.startsWith("«") || !body.endsWith("»")) {
    throw new NormsRegistryError(`${code}: цитата должна быть в кавычках «…» в строке «> …»`);
  }
  return body.slice(1, -1);
}

export function parseNormsRegistry(markdown: string): ParsedNorm[] {
  const lines = markdown.split(/\r?\n/);
  const norms: ParsedNorm[] = [];
  const seen = new Set<string>();
  let document: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const docMatch = line.match(DOCUMENT_HEADER);
    if (docMatch?.[1]) {
      document = docMatch[1].trim();
      continue;
    }
    const header = line.match(NORM_HEADER);
    if (!header?.[1]) continue;

    const code = header[1];
    if (seen.has(code)) {
      throw new NormsRegistryError(`код ${code} встречается дважды`);
    }
    if (!document) {
      throw new NormsRegistryError(`${code}: норма стоит до первого заголовка документа «## …»`);
    }
    const { clause, page } = splitClause(code, header[2] ?? "");

    // Цитата: первая непустая строка после заголовка, начинается с «>».
    let j = i + 1;
    while (j < lines.length && (lines[j] ?? "").trim() === "") j++;
    const quoteLine = lines[j] ?? "";
    if (!quoteLine.startsWith(">")) {
      throw new NormsRegistryError(`${code}: после заголовка нет строки цитаты «> «…»»`);
    }
    // «Где: …» — первая строка, начинающаяся с «Где:», до следующей нормы.
    let usedIn: string | null = null;
    for (let k = j + 1; k < lines.length; k++) {
      const next = lines[k] ?? "";
      if (NORM_HEADER.test(next) || DOCUMENT_HEADER.test(next)) break;
      if (next.startsWith("Где:")) {
        usedIn = next
          .replace(/^Где:\s*/, "")
          .replace(/\s*Сверено:.*$/, "")
          .trim();
        break;
      }
    }
    norms.push({ code, document, clause, page, quote: unquote(code, quoteLine), usedIn });
    seen.add(code);
    i = j;
  }

  if (norms.length === 0) {
    throw new NormsRegistryError("не найдено ни одной записи вида «**N-xx.** …»");
  }
  return norms;
}

/** Число заголовков норм в файле: для проверки, что парсер ничего не пропустил. */
export function countNormHeaders(markdown: string): number {
  return markdown.split(/\r?\n/).filter((line) => NORM_HEADER.test(line)).length;
}
