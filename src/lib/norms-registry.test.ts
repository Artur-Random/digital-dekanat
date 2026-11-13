import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { NormsRegistryError, countNormHeaders, parseNormsRegistry } from "./norms-registry";

const REGISTRY = readFileSync(join(process.cwd(), "docs", "norms-registry.md"), "utf8");

describe("parseNormsRegistry", () => {
  it("число норм равно числу записей N-xx в реестре", () => {
    const norms = parseNormsRegistry(REGISTRY);
    const headers = REGISTRY.match(/^\*\*N-\d+\.\*\*/gm) ?? [];
    expect(norms.length).toBe(headers.length);
    expect(norms.length).toBe(countNormHeaders(REGISTRY));
    expect(new Set(norms.map((n) => n.code)).size).toBe(norms.length);
  });

  it("разбирает документ, пункт, страницу и цитату", () => {
    const norms = parseNormsRegistry(REGISTRY);
    const n09 = norms.find((n) => n.code === "N-09");
    expect(n09).toMatchObject({ clause: "п. 7.3", page: "13" });
    expect(n09?.document).toMatch(/^426общ/);
    expect(n09?.quote).toMatch(/^7\.3 Обучающиеся, имеющие академическую задолженность/);
    expect(n09?.quote.endsWith("»")).toBe(false);
  });

  it("сохраняет внутренние кавычки и норму без страницы", () => {
    const norms = parseNormsRegistry(REGISTRY);
    expect(norms.find((n) => n.code === "N-03")?.quote).toContain("«неудовлетворительно»");
    expect(norms.find((n) => n.code === "N-52")).toMatchObject({
      clause: "ст. 58, ч. 11",
      page: null,
    });
  });

  it("сохраняет «Где используется» без отметки «Сверено»", () => {
    const norms = parseNormsRegistry(REGISTRY);
    expect(norms.find((n) => n.code === "N-09")?.usedIn).toBe("S3a, счётчик «Попытка 1 из 2».");
    expect(norms.every((n) => n.usedIn && !n.usedIn.includes("Сверено"))).toBe(true);
  });

  it("падает с понятной ошибкой, если нет цитаты", () => {
    const broken = "## Документ\n\n**N-99.** п. 1, стр. 1\nтекст без цитаты\n";
    expect(() => parseNormsRegistry(broken)).toThrow(NormsRegistryError);
    expect(() => parseNormsRegistry(broken)).toThrow(/N-99/);
  });

  it("падает на повторе кода и на пустом реестре", () => {
    const dup = "## Д\n**N-1.** п. 1\n> «а»\n**N-1.** п. 2\n> «б»\n";
    expect(() => parseNormsRegistry(dup)).toThrow(/дважды/);
    expect(() => parseNormsRegistry("# пусто")).toThrow(NormsRegistryError);
  });
});
