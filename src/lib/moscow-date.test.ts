import { describe, expect, it } from "vitest";

import { formatMoscowIso } from "./moscow-date";

describe("formatMoscowIso", () => {
  it("переводит UTC в московское время со смещением +03:00", () => {
    expect(formatMoscowIso(new Date("2026-11-12T01:00:05.123Z"))).toBe("2026-11-12T04:00:05+03:00");
    expect(formatMoscowIso(new Date("2026-11-11T22:30:00Z"))).toBe("2026-11-12T01:30:00+03:00");
  });
});
