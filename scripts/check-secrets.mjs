// Проверка клона репозитория перед упаковкой архива для жюри.
// Использование: node scripts/check-secrets.mjs <каталог-клона>
// Код выхода 1, если найдены файлы .env* (кроме .env.example) или строки, похожие на секреты,
// в текущих файлах или в истории git. Правила поиска те же, что у хука записи промптов.

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

import { findSecrets } from "../.claude/hooks/log-prompt.mjs";

// Файлы с заведомо поддельными секретами для тестов маскирования.
const FIXTURE_FILES = new Set([
  ".claude/hooks/log-prompt.test.ts",
  "scripts/make-source-archive.test.ts",
]);

// Значения-заглушки из документации и примеров, а не настоящие секреты.
const PLACEHOLDERS =
  /^(?:\.{2,}|…|\[СКРЫТО\]|\*+|<[^>]*>|\$\{[^}]*\}|ПАРОЛЬ|ПОЛЬЗОВАТЕЛЬ|pass|password|secret|token|changeme|null|undefined|true|false)$/i;

const BINARY_EXTENSIONS = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|otf|pdf|zip)$/i;

/** @param {string} path */
function isEnvFile(path) {
  const name = path.split("/").pop() ?? "";
  return /^\.env(\..*)?$/.test(name) && name !== ".env.example";
}

/**
 * @param {string} cwd
 * @param {string[]} args
 */
function git(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
}

/**
 * @param {string} dir
 * @returns {string[]} описание проблем
 */
export function checkRepository(dir) {
  const root = resolve(dir);
  /** @type {string[]} */
  const problems = [];

  // Все пути, которые когда-либо были в истории, и текущие.
  const historyPaths = new Set(
    git(root, ["log", "--all", "--name-only", "--format="]).split("\n").filter(Boolean),
  );
  for (const path of git(root, ["ls-files"]).split("\n").filter(Boolean)) historyPaths.add(path);
  for (const path of historyPaths) {
    if (isEnvFile(path)) problems.push(`${path}: файл окружения в репозитории или его истории`);
  }

  // Каждый текстовый blob из истории: так проверяются и удалённые позже файлы.
  const objects = git(root, ["rev-list", "--all", "--objects"]).split("\n").filter(Boolean);
  const seen = new Set();
  for (const entry of objects) {
    const space = entry.indexOf(" ");
    if (space < 0) continue;
    const sha = entry.slice(0, space);
    const path = entry.slice(space + 1);
    if (seen.has(sha) || FIXTURE_FILES.has(path) || BINARY_EXTENSIONS.test(path)) continue;
    seen.add(sha);
    if (git(root, ["cat-file", "-t", sha]).trim() !== "blob") continue;
    const content = git(root, ["cat-file", "-p", sha]);
    if (content.includes("\u0000")) continue;
    for (const hit of findSecrets(content)) {
      if (PLACEHOLDERS.test(hit.value.replace(/^["']|["']$/g, ""))) continue;
      problems.push(`${path}:${hit.line}: похоже на секрет (${hit.rule})`);
    }
  }
  return problems;
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (invokedDirectly) {
  const dir = process.argv[2];
  if (!dir) {
    console.error("Использование: node scripts/check-secrets.mjs <каталог>");
    process.exit(2);
  }
  const problems = checkRepository(dir);
  if (problems.length > 0) {
    // Значения секретов не печатаем: только файл, строку и тип.
    console.error("Архив не собран, найдены проблемы:");
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log("Проверка на секреты пройдена.");
}
