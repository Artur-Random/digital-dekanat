// Доступность (критерий конкурса, задание 19.11): axe на всех экранах из screens.ts.
// Критичных (critical) и серьёзных (serious) нарушений WCAG 2.1 A/AA быть не должно,
// включая контраст (color-contrast).

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { prepareForScreen } from "./auth";
import { SCREENS, resolvePath } from "./screens";

const WIDTHS = [360, 1440] as const;
// Тёмная тема — те же токены с другими значениями: контраст проверяется в обеих.
const THEMES = ["light", "dark"] as const;

for (const screen of SCREENS) {
  for (const width of WIDTHS) {
    for (const theme of THEMES) {
      test(`axe: ${screen.code} ${screen.slug} ${width}px ${theme}`, async ({
        page,
        context,
        baseURL,
      }) => {
        await context.addCookies([
          { name: "theme", value: theme, url: baseURL ?? "http://localhost:3000" },
        ]);
        await page.setViewportSize({ width, height: 900 });
        await prepareForScreen(page, screen);
        await page.goto(await resolvePath(screen), { waitUntil: "networkidle" });
        const result = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        const serious = result.violations
          .filter((v) => v.impact === "critical" || v.impact === "serious")
          .map(
            (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
          );
        expect(serious).toEqual([]);
      });
    }
  }
}
