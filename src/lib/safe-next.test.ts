import { describe, expect, it } from "vitest";

import { safeNextPath } from "./safe-next";

describe("safeNextPath", () => {
  it.each([
    "//evil.example",
    "https://evil.example",
    "/\\evil.example",
    "\\\\evil.example",
    "http:/evil.example",
    "javascript:alert(1)",
    "/\t/evil.example",
    "evil.example",
    "",
    "/login",
    "/login?next=/",
    // Нормализация «.» и «..» даёт «//evil.example» (находка security-reviewer).
    "/.//evil.example",
    "/%2e%2e//evil.example",
    "/x/..//evil.example",
    "/staff/../profile",
  ])("отбрасывает %j", (input) => {
    expect(safeNextPath(input)).toBeNull();
  });

  it.each([
    ["/", "/"],
    ["/profile", "/profile"],
    ["/applications/abc?x=1#y", "/applications/abc?x=1#y"],
  ])("принимает %j", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it("не принимает не строку", () => {
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath(["/profile"])).toBeNull();
  });
});
