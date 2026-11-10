import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  MASK,
  MASKED_NOTE,
  PROMPTS_FILE,
  fenceFor,
  formatEntry,
  formatMoscowTimestamp,
  maskSecrets,
} from "./log-prompt.mjs";

const SCRIPT = fileURLToPath(new URL("./log-prompt.mjs", import.meta.url));

describe("maskSecrets", () => {
  it.each([
    ["токен GitHub ghp_", `push ghp_${"a".repeat(36)} now`],
    ["fine-grained токен GitHub", `github_pat_${"A1_".repeat(20)}`],
    ["API-ключ Yandex Cloud", `key AQVN${"x".repeat(36)}`],
    ["IAM-токен Yandex Cloud", `t1.9euelZqNk5WTmJKSlJ.${"b".repeat(60)}`],
    ["ключ вида sk-", `sk-ant-${"c".repeat(40)}`],
    ["AWS access key", "AKIAABCDEFGHIJKLMNOP"],
    ["заголовок Bearer", "Authorization: Bearer abcdefghijklmnop"],
    ["русское «пароль:»", "пароль: Qwerty123!"],
  ])("скрывает %s", (_name, input) => {
    const { text, masked } = maskSecrets(input);
    expect(masked).toBe(true);
    expect(text).toContain(MASK);
    expect(text).not.toMatch(/ghp_a|github_pat_|AQVNx|t1\.9eu|sk-ant|AKIAA|abcdefgh|Qwerty/);
  });

  it("скрывает приватный ключ целиком", () => {
    const pem = [
      "до",
      "-----BEGIN OPENSSH PRIVATE KEY-----",
      "b3BlbnNzaC1rZXktdjEAAAAA",
      "-----END OPENSSH PRIVATE KEY-----",
      "после",
    ].join("\n");
    expect(maskSecrets(pem).text).toBe(`до\n${MASK}\nпосле`);
  });

  it("скрывает обрезанный приватный ключ без END", () => {
    expect(maskSecrets("-----BEGIN RSA PRIVATE KEY-----\nMIIEow").text).toBe(MASK);
  });

  it("скрывает значения в парах ключ=значение и сохраняет ключ", () => {
    const input = 'password=hunter2 secret: "s3 cr3t" DB_TOKEN=abc; "api_key": \'k\'';
    const { text, masked } = maskSecrets(input);
    expect(masked).toBe(true);
    expect(text).toBe(`password=${MASK} secret: ${MASK} DB_TOKEN=${MASK}; "api_key": ${MASK}`);
  });

  it("скрывает пароль в URL подключения", () => {
    expect(maskSecrets("postgresql://app:VerySecret@localhost:5432/db").text).toBe(
      `postgresql://app:${MASK}@localhost:5432/db`,
    );
  });

  it("не трогает обычный текст", () => {
    const input = "Сделай экран S1 по спецификации, срок до 18 ноября.";
    expect(maskSecrets(input)).toEqual({ text: input, masked: false });
  });
});

describe("formatMoscowTimestamp", () => {
  it("переводит время в Europe/Moscow (UTC+3)", () => {
    expect(formatMoscowTimestamp(new Date("2026-11-10T21:05:00Z"))).toBe("2026-11-11 00:05");
  });
});

describe("formatEntry", () => {
  const date = new Date("2026-11-10T07:30:00Z");

  it("формирует заголовок и ограждение из четырёх тильд", () => {
    const entry = formatEntry("Привет\n```ts\nconst a = 1;\n```\n", date);
    expect(entry).toBe(
      "\n### 2026-11-10 10:30 МСК\n\n~~~~\nПривет\n```ts\nconst a = 1;\n```\n~~~~\n",
    );
  });

  it("добавляет пометку, если что-то скрыто", () => {
    expect(formatEntry("token=abc", date)).toBe(
      `\n### 2026-11-10 10:30 МСК\n\n${MASKED_NOTE}\n\n~~~~\ntoken=${MASK}\n~~~~\n`,
    );
  });

  it("удлиняет ограждение, если в промпте уже есть ~~~~", () => {
    expect(fenceFor("a\n~~~~\nb")).toBe("~~~~~");
    expect(fenceFor("без тильд")).toBe("~~~~");
  });
});

describe("запуск хука как процесса", () => {
  // Временный каталог в системном tmp; ОС очищает его сама.
  function run(stdin: string) {
    const dir = mkdtempSync(join(tmpdir(), "log-prompt-"));
    const result = spawnSync(process.execPath, [SCRIPT], {
      input: stdin,
      env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
      encoding: "utf8",
    });
    return { dir, result };
  }

  it("дописывает запись, stdout пустой, код 0", () => {
    const { dir, result } = run(
      JSON.stringify({ hook_event_name: "UserPromptSubmit", prompt: "Тест" }),
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
    const content = readFileSync(join(dir, PROMPTS_FILE), "utf8");
    expect(content).toMatch(/### \d{4}-\d{2}-\d{2} \d{2}:\d{2} МСК\n\n~~~~\nТест\n~~~~\n$/);
  });

  it("при ошибке пишет в stderr без содержимого входа и всё равно выходит с 0", () => {
    const { result } = run("password=hunter2 не JSON");
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("log-prompt:");
    expect(result.stderr).not.toContain("hunter2");
  });
});
