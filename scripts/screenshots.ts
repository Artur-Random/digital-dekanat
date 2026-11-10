// Автоскриншоты всех экранов из e2e/screens.ts в двух ширинах.
// Результат: docs/process/screenshots/ГГГГ-ММ-ДД_ЧЧММ/<code>-<slug>-<ширина>.png (время по Москве).
// Если по BASE_URL никто не отвечает, скрипт сам поднимает `next dev` и гасит его в конце.

import { type ChildProcess, spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "@playwright/test";

import { prepareForScreen } from "../e2e/auth";
import { BASE_URL } from "../e2e/base-url";
import { disconnect } from "../e2e/helpers/db";
import { SCREENS, VIEWPORTS, resolvePath } from "../e2e/screens";

function moscowStamp(date: Date): string {
  const parts = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}_${get("hour")}${get("minute")}`;
}

async function isUp(url: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureServer(): Promise<ChildProcess | null> {
  const probe = `${BASE_URL}/login`;
  if (await isUp(probe)) return null;
  if (process.env.BASE_URL) {
    throw new Error(`Сервер ${BASE_URL} не отвечает`);
  }
  console.log("Сервер не запущен, поднимаю next dev…");
  const server = spawn("npx", ["next", "dev"], { stdio: "ignore", detached: true });
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (await isUp(probe)) return server;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  stopServer(server);
  throw new Error("next dev не поднялся за 120 секунд");
}

function stopServer(server: ChildProcess | null): void {
  if (server?.pid) {
    // Отрицательный pid гасит всю группу процессов: npx и дочерний next.
    process.kill(-server.pid, "SIGTERM");
  }
}

async function main(): Promise<void> {
  const outDir = join("docs", "process", "screenshots", moscowStamp(new Date()));
  mkdirSync(outDir, { recursive: true });

  const server = await ensureServer();
  const browser = await chromium.launch();
  try {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport,
        deviceScaleFactor: 1,
        locale: "ru-RU",
        timezoneId: "Europe/Moscow",
        baseURL: BASE_URL,
      });
      for (const screen of SCREENS) {
        const page = await context.newPage();
        await prepareForScreen(page, screen);
        const path = await resolvePath(screen);
        const response = await page.goto(path, { waitUntil: "networkidle" });
        if (!response?.ok()) {
          throw new Error(`${screen.code} ${path}: HTTP ${response?.status() ?? "нет ответа"}`);
        }
        const file = join(outDir, `${screen.code}-${screen.slug}-${viewport.width}.png`);
        await page.screenshot({ path: file, fullPage: true });
        console.log(file);
        await page.close();
      }
      await context.close();
    }
  } finally {
    await browser.close();
    await disconnect();
    stopServer(server);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
