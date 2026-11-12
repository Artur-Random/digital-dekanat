# Production-образы собираются только в GitHub Actions (на сервере 2 ГБ памяти, сборки там нет).
#   app   — standalone-сборка Next.js, без полного node_modules;
#   tools — Prisma CLI, миграции и скомпилированный сброс демо-данных (команды migrate, demo-reset).
# Мажорная версия Node совпадает с .nvmrc.
ARG NODE_IMAGE=node:22.23.4-bookworm-slim

FROM ${NODE_IMAGE} AS base
ENV NEXT_TELEMETRY_DISABLED=1
# openssl нужен Prisma, чтобы определить платформу schema-engine.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json .npmrc prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

FROM deps AS build
COPY . .
RUN npm run build && npm run build:tools

FROM base AS app
ARG APP_VERSION=dev
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    APP_VERSION=${APP_VERSION}
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]

FROM base AS tools-deps
COPY package.json package-lock.json .npmrc prisma.config.ts ./
COPY prisma ./prisma
# Только production-зависимости. Пакеты веб-приложения, peer-зависимости (Playwright, TypeScript),
# и встроенный PGlite (`prisma dev`) миграциям и сбросу не нужны. Studio и @prisma/dev CLI грузит при старте.
RUN npm ci --omit=dev --no-audit --no-fund \
  && cd node_modules \
  && rm -rf next @next react react-dom lucide-react @fontsource-variable sharp @img \
            playwright playwright-core typescript @types \
            @electric-sql \
  && cd .. && npx prisma --version >/dev/null

FROM base AS tools
# CHECKPOINT_DISABLE: Prisma CLI не ходит в интернет за проверкой версий (сервер без внешних запросов).
ENV NODE_ENV=production \
    CHECKPOINT_DISABLE=1
COPY --from=tools-deps /app/node_modules ./node_modules
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/dist/reset-demo.mjs ./dist/reset-demo.mjs
COPY package.json prisma.config.ts ./
COPY prisma ./prisma
COPY docs/norms-registry.md ./docs/norms-registry.md
COPY deploy/tools-entrypoint.sh /usr/local/bin/tools
USER node
ENTRYPOINT ["tools"]
CMD ["help"]
