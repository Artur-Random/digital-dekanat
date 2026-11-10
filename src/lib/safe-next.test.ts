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
  ])("отбрасывает %j", (input) => {
    expect(safeNextPath(input)).toBeNull();
  });

  it.each([
    ["/", "/"],
    ["/profile", "/profile"],
    ["/applications/abc?x=1#y", "/applications/abc?x=1#y"],
    ["/staff/../profile", "/profile"],
  ])("принимает %j", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it("не принимает не строку", () => {
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath(["/profile"])).toBeNull();
  });
});
