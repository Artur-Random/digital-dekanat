// Фирменные файлы из логотипов docs/process/design/ (ChatGPT Images → vectorizer.ai):
// - логотипы без фона: убирается фоновая фигура на весь холст, холст обрезается по содержимому;
// - иконки PWA и favicon из studcab-icon-square.svg (фон иконки сохраняется).
// Запуск: npx tsx scripts/brand-assets.ts. Результат коммитится (public/brand, public/icons).

import { readFileSync, writeFileSync } from "node:fs";

import { chromium } from "playwright";

/**
 * Убрать фон: только фигуру на весь холст. Белые просветы букв и окон маяка векторизатор
 * рисует отдельными фигурами поверх заливки, поэтому их оставляем: логотип ставится на фон
 * того же цвета (светлая тема — белый, тёмная — #14213D, цвет фона logo-dark).
 */
function stripBackground(svg: string): string {
  const first = /<path[^>]*\/>\s*/.exec(svg);
  if (!first) throw new Error("Не найдена фоновая фигура");
  return svg.replace(first[0], "");
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Логотипы: обрезка по содержимому через getBBox в браузере.
  for (const name of ["studcab-logo-light", "studcab-logo-dark"]) {
    const stripped = stripBackground(readFileSync(`docs/process/design/${name}.svg`, "utf8"));
    await page.setContent(stripped);
    const box = await page.evaluate(() => {
      const svg = document.querySelector("svg");
      if (!svg) throw new Error("нет svg");
      const b = svg.getBBox();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    });
    const pad = 4;
    const viewBox = `${Math.floor(box.x - pad)} ${Math.floor(box.y - pad)} ${Math.ceil(box.w + 2 * pad)} ${Math.ceil(box.h + 2 * pad)}`;
    const out = stripped
      .replace(/<\?xml[^>]*\?>\s*/, "")
      .replace(/<!--[^>]*-->\s*/, "")
      .replace(
        /<svg [^>]*>/,
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="Студкаб">`,
      );
    writeFileSync(`public/brand/${name}.svg`, out);
    console.log(name, viewBox, `${Math.round(out.length / 1024)} КБ`);
  }

  // Иконки: квадрат с фоном; maskable — содержимое в безопасной зоне 80%.
  const icon = readFileSync("docs/process/design/studcab-icon-square.svg", "utf8")
    .replace(/<\?xml[^>]*\?>\s*/, "")
    .replace(/<svg [^>]*>/, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1254 1254">');
  writeFileSync("public/brand/studcab-icon.svg", icon);
  const bg = /fill="(#[0-9A-Fa-f]{6})"/.exec(icon)?.[1] ?? "#0E1D39";
  const shots: { file: string; size: number; scale: number }[] = [
    { file: "public/icons/icon-192.png", size: 192, scale: 1 },
    { file: "public/icons/icon-512.png", size: 512, scale: 1 },
    { file: "public/icons/maskable-512.png", size: 512, scale: 0.8 },
    { file: "public/icons/apple-touch-icon.png", size: 180, scale: 1 },
    { file: "src/app/icon.png", size: 32, scale: 1 },
  ];
  for (const s of shots) {
    await page.setViewportSize({ width: s.size, height: s.size });
    const inner = Math.round(s.size * s.scale);
    await page.setContent(
      `<body style="margin:0;background:${bg};display:grid;place-items:center;width:${s.size}px;height:${s.size}px">` +
        `<div style="width:${inner}px;height:${inner}px">${icon.replace("<svg ", '<svg width="100%" height="100%" ')}</div></body>`,
    );
    await page.screenshot({ path: s.file, omitBackground: false });
    console.log(s.file);
  }
  await browser.close();
}

void main();
