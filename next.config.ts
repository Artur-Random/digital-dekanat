import type { NextConfig } from "next";

import { buildSecurityHeaders } from "./src/lib/security-headers";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Значок dev-режима попадает в автоскриншоты, он не нужен.
  devIndicators: false,
  // Иначе next dev сам пишет AGENTS.md с инструкциями для ИИ-агентов. Главный документ
  // для агентов в этом репозитории CLAUDE.md, второй источник инструкций не нужен.
  agentRules: false,
  async headers() {
    return [{ source: "/:path*", headers: buildSecurityHeaders(isDev) }];
  },
};

export default nextConfig;
