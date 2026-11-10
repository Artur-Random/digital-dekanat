import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const SCRIPT = fileURLToPath(new URL("./make-source-archive.sh", import.meta.url));
// Поддельный токен собран из частей, чтобы не выглядеть секретом в этом файле.
const FAKE_TOKEN = ["ghp", "_", "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8"].join("");

function git(cwd: string, ...args: string[]): void {
  execFileSync("git", ["-c", "user.name=test", "-c", "user.email=test@example.invalid", ...args], {
    cwd,
    stdio: "ignore",
  });
}

function makeRepo(files: Record<string, string>, untracked: Record<string, string> = {}) {
  const root = mkdtempSync(join(tmpdir(), "archive-test-"));
  const repo = join(root, "repo");
  const out = join(root, "out");
  execFileSync("git", ["init", "-q", repo]);
  for (const [name, content] of Object.entries(files)) writeFileSync(join(repo, name), content);
  git(repo, "add", "-A");
  git(repo, "commit", "-q", "-m", "init");
  for (const [name, content] of Object.entries(untracked)) writeFileSync(join(repo, name), content);
  return { repo, out };
}

function runArchive(repo: string, out: string) {
  return spawnSync("bash", [SCRIPT], {
    env: { ...process.env, ARCHIVE_SOURCE: repo, ARCHIVE_OUT_DIR: out },
    encoding: "utf8",
  });
}

function zipEntries(out: string): string[] {
  const [zip] = readdirSync(out);
  if (!zip) return [];
  return execFileSync("unzip", ["-Z1", join(out, zip)], { encoding: "utf8" }).split("\n");
}

describe("make-source-archive.sh", () => {
  it("собирает архив с историей git и без незакоммиченного .env", () => {
    const { repo, out } = makeRepo(
      { "README.md": "# demo\n", ".env.example": "DATABASE_URL=\n", ".gitignore": ".env\n" },
      { ".env": `DATABASE_URL=postgresql://u:VerySecret1@localhost/db\nGH=${FAKE_TOKEN}\n` },
    );
    const result = runArchive(repo, out);
    expect(result.status, result.stderr).toBe(0);
    const entries = zipEntries(out);
    expect(entries).toContain("digital-dekanat/README.md");
    expect(entries).toContain("digital-dekanat/.env.example");
    expect(entries.some((e) => e.startsWith("digital-dekanat/.git/"))).toBe(true);
    expect(entries).not.toContain("digital-dekanat/.env");
  });

  it("не собирает архив, если в коммите строка с токеном", () => {
    const { repo, out } = makeRepo({ "config.ts": `export const token = "${FAKE_TOKEN}";\n` });
    const result = runArchive(repo, out);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("config.ts");
    // Само значение секрета в вывод не попадает.
    expect(result.stderr).not.toContain(FAKE_TOKEN);
    expect(() => readdirSync(out)).toThrow();
  });

  it("не собирает архив, если .env когда-либо был закоммичен", () => {
    const { repo, out } = makeRepo({ ".env": "DATABASE_URL=\n", "README.md": "x\n" });
    git(repo, "rm", "-q", ".env");
    git(repo, "commit", "-q", "-m", "remove env");
    const result = runArchive(repo, out);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(".env: файл окружения");
  });
});
