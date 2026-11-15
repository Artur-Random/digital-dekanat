import { describe, expect, it } from "vitest";

import { normLabel, shortClause, shortDocument } from "./norm-label";

describe("подпись нормы", () => {
  it("документ и пункт вместо кода", () => {
    expect(
      normLabel({
        document: "754общ от 30.06.2025: Положение об академическом отпуске",
        clause: "п. 2.13",
      }),
    ).toBe("754общ, п. 2.13");
  });

  it("закон и указы", () => {
    expect(shortDocument("273-ФЗ «Об образовании в Российской Федерации»")).toBe("273-ФЗ");
    expect(
      shortDocument(
        "Указ Президента РФ от 22.01.2026 № 27 «О внесении изменений в Указ Президента Российской Федерации от 12 мая 2023 г. № 343»",
      ),
    ).toBe("Указ № 27");
  });

  it("пояснения в скобках убираются", () => {
    expect(shortClause("п. 1 «в» (новый п. 3¹ Указа № 343, подпункт «б»)")).toBe("п. 1 «в»");
    expect(shortClause("ст. 58, ч. 11")).toBe("ст. 58, ч. 11");
  });
});
