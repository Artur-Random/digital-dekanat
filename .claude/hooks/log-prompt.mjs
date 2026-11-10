// Хук UserPromptSubmit: дописывает промпт в docs/process/prompts.md.
// Правила (см. задание 1):
// - stdout пустой всегда: при коде 0 Claude Code добавляет stdout в контекст модели;
// - код выхода всегда 0: код 2 отклонил бы промпт, ошибка записи не должна мешать работе;
// - очевидные секреты заменяются на [СКРЫТО] до записи на диск.

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const MASK = "[СКРЫТО]";
export const MASKED_NOTE = "(в промпте скрыты секреты)";
export const PROMPTS_FILE = join("docs", "process", "prompts.md");

const FILE_HEADER =
  "# Промпты Кирилла\n\n" +
  "Файл ведёт хук `.claude/hooks/log-prompt.mjs` (событие UserPromptSubmit). Вручную не редактируется.\n";

/**
 * Правила поиска секретов. Порядок важен: сначала многострочные ключи и URL с паролем,
 * потом токены известного формата, в конце пары «ключ=значение».
 * Если в шаблоне две группы, первая (префикс) сохраняется, вторая (сам секрет) скрывается;
 * иначе скрывается всё совпадение. Эти же правила использует scripts/check-secrets.mjs.
 * @type {ReadonlyArray<{ name: string, pattern: RegExp }>}
 */
export const SECRET_RULES = [
  // Приватные ключи PEM, в том числе обрезанные без строки END.
  {
    name: "private-key",
    pattern:
      /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z0-9 ]*PRIVATE KEY-----|$)/g,
  },
  // Логин и пароль внутри URL: схема://логин:пароль@хост
  { name: "url-credentials", pattern: /([a-z][a-z0-9+.-]*:\/\/[^\s:/@]+:)([^\s@/]+)(?=@)/gi },
  // Токены GitHub: ghp_, gho_, ghu_, ghs_, ghr_ и fine-grained github_pat_.
  { name: "github-pat", pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}/g },
  { name: "github-token", pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}/g },
  // Yandex Cloud: API-ключи (AQVN...), IAM-токены (t1....), секреты статических ключей (YC...).
  { name: "yandex-api-key", pattern: /\bAQVN[A-Za-z0-9_-]{20,}/g },
  { name: "yandex-iam-token", pattern: /\bt1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{20,}/g },
  { name: "yandex-static-key", pattern: /\bYC[A-Za-z0-9_-]{30,}/g },
  // Другие частые форматы: ключи вида sk-..., AWS access key, заголовок Bearer.
  { name: "sk-key", pattern: /\bsk-[A-Za-z0-9_-]{20,}/g },
  { name: "aws-access-key", pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "bearer", pattern: /(\bBearer[ \t]+)([A-Za-z0-9._~+/=-]{8,})/g },
  // Пары password=..., secret=..., token=..., api_key: ..., пароль: ... (в том числе JSON и .env).
  // Пробелы только внутри строки: пустое «KEY=» не должно захватывать следующую строку.
  {
    name: "key-value",
    pattern:
      /([A-Za-z0-9_-]*(?:password|passwd|pwd|secret|token|api[_-]?key|пароль|токен|секрет)[A-Za-z0-9_-]*["']?[ \t]*[=:][ \t]*)("[^"\n]*"|'[^'\n]*'|[^\s"',;]+)/gi,
  },
];

/**
 * @param {string} match
 * @param {unknown[]} groups
 */
function maskMatch(match, groups) {
  const [prefix, secret] = groups;
  if (typeof prefix === "string" && typeof secret === "string") return `${prefix}${MASK}`;
  return MASK;
}

/**
 * Заменяет очевидные секреты на [СКРЫТО].
 * @param {string} text
 * @returns {{ text: string, masked: boolean }}
 */
export function maskSecrets(text) {
  let result = text;
  for (const rule of SECRET_RULES) {
    result = result.replace(rule.pattern, (match, ...groups) => maskMatch(match, groups));
  }
  return { text: result, masked: result !== text };
}

/**
 * Все совпадения с правилами: имя правила, строка (с 1) и найденное значение секрета.
 * @param {string} text
 * @returns {Array<{ rule: string, line: number, value: string }>}
 */
export function findSecrets(text) {
  /** @type {Array<{ rule: string, line: number, value: string }>} */
  const found = [];
  for (const rule of SECRET_RULES) {
    for (const m of text.matchAll(rule.pattern)) {
      const value = typeof m[2] === "string" ? m[2] : m[0];
      const line = text.slice(0, m.index ?? 0).split("\n").length;
      found.push({ rule: rule.name, line, value });
    }
  }
  return found;
}

/**
 * Дата и время по Москве в виде «ГГГГ-ММ-ДД ЧЧ:ММ».
 * @param {Date} date
 * @returns {string}
 */
export function formatMoscowTimestamp(date) {
  const parts = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  /** @param {string} type */
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

/**
 * Ограждение из тильд. Четыре тильды по умолчанию; если в промпте уже есть строка
 * из четырёх и более тильд, ограждение делаем длиннее, чтобы разметка не сломалась.
 * @param {string} text
 * @returns {string}
 */
export function fenceFor(text) {
  const runs = text.match(/~{4,}/g) ?? [];
  const longest = runs.reduce((max, run) => Math.max(max, run.length), 3);
  return "~".repeat(longest + 1);
}

/**
 * Готовая запись для prompts.md.
 * @param {string} prompt
 * @param {Date} date
 * @returns {string}
 */
export function formatEntry(prompt, date) {
  const { text, masked } = maskSecrets(prompt);
  const fence = fenceFor(text);
  const lines = [`### ${formatMoscowTimestamp(date)} МСК`, ""];
  if (masked) {
    lines.push(MASKED_NOTE, "");
  }
  lines.push(fence, text.replace(/\n+$/, ""), fence, "");
  return `\n${lines.join("\n")}`;
}

/**
 * Корень проекта: из CLAUDE_PROJECT_DIR, иначе на два уровня выше скрипта.
 * @returns {string}
 */
function projectDir() {
  const fromEnv = process.env.CLAUDE_PROJECT_DIR;
  if (fromEnv) return fromEnv;
  return resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
}

/**
 * @param {string} raw содержимое stdin
 * @param {string} root корень проекта
 * @param {Date} now
 */
export function handleInput(raw, root, now) {
  /** @type {unknown} */
  const input = JSON.parse(raw);
  const prompt =
    typeof input === "object" && input !== null && "prompt" in input ? input.prompt : undefined;
  if (typeof prompt !== "string") {
    throw new Error("во входных данных нет строкового поля prompt");
  }
  const file = join(root, PROMPTS_FILE);
  mkdirSync(dirname(file), { recursive: true });
  if (!existsSync(file)) {
    appendFileSync(file, FILE_HEADER, "utf8");
  }
  appendFileSync(file, formatEntry(prompt, now), "utf8");
}

function main() {
  try {
    const raw = readFileSync(0, "utf8");
    handleInput(raw, projectDir(), new Date());
  } catch (error) {
    // Только причина, без содержимого промпта: в нём могут быть секреты.
    // Сообщение SyntaxError от JSON.parse содержит фрагмент входа, поэтому его не выводим.
    const reason =
      error instanceof SyntaxError
        ? "некорректный JSON во входных данных"
        : error instanceof Error
          ? error.message
          : "неизвестная ошибка";
    process.stderr.write(`log-prompt: промпт не записан: ${reason}\n`);
  }
  process.exitCode = 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
